"""
MRCP Circuit — Blender Python Script
=====================================
Run inside Blender (Scripting workspace > Open > Run Script)

Creates the MRCP Circuit Alpha lollipop layout with:
  - Class A track (manned, altitude band 30-80m → Y=40 in scene units)
  - Class B track (autonomous, altitude band 0-30m → Y=15 in scene units)
  - 6 mission gate torus rings
  - Ground plane with grid material
  - Airspace band separator plane (30-35m buffer zone)
  - Emissive neon materials for Cycles rendering

After running, export via:
  File > Export > glTF 2.0 (.glb/.gltf)
  Include: Meshes, Materials, Apply Modifiers
  Format: GLB (binary, single file)
  Output: mrcp-circuit.glb  (place alongside mrcp-simulator.html)

Scale reference:
  Simulator SVG: 800 × 550 units (mapped to W=800, H=550 pixels)
  Blender scene:  800 × 550 world units, Y=altitude
"""

import bpy
import bmesh
from mathutils import Vector
import math

# ── Clean slate ──────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# ── Constants matching mrcp-simulator.html ───────────────────────────────────
W, H = 800, 550

# Bezier control points (normalised 0-1 → multiplied by W/H)
SEGS = [
    ((0.15,0.25),(0.22,0.08),(0.32,0.07),(0.40,0.10)),  # G1 → G2
    ((0.40,0.10),(0.50,0.06),(0.62,0.10),(0.70,0.20)),  # G2 → G3
    ((0.70,0.20),(0.80,0.22),(0.90,0.38),(0.85,0.55)),  # G3 → G4
    ((0.85,0.55),(0.88,0.70),(0.80,0.82),(0.65,0.80)),  # G4 → G5
    ((0.65,0.80),(0.52,0.90),(0.35,0.88),(0.20,0.75)),  # G5 → FINISH
    ((0.20,0.75),(0.08,0.65),(0.07,0.42),(0.15,0.25)),  # FINISH → G1
]

GATES = {
    'G1':     {'x':0.15,'y':0.25,'color':(0.541,0.608,0.710),'name':'Recon Sector'},
    'G2':     {'x':0.40,'y':0.10,'color':(0.000,0.831,1.000),'name':'Technical Zone'},
    'G3':     {'x':0.70,'y':0.20,'color':(0.000,0.831,1.000),'name':'Strategy Waypoint'},
    'G4':     {'x':0.85,'y':0.55,'color':(1.000,0.420,0.000),'name':'Power Sector'},
    'G5':     {'x':0.65,'y':0.80,'color':(1.000,0.420,0.000),'name':'Final Push'},
    'FINISH': {'x':0.20,'y':0.75,'color':(0.000,1.000,0.533),'name':'Data Capture'},
}

CLASS_A_ALT =  40.0   # Y in Blender world (30-80m band representative)
CLASS_B_ALT =  15.0   # Y in Blender world (0-30m band representative)
BUFFER_ALT  =  32.5   # 30-35m buffer midpoint

TRACK_RADIUS_A = 2.5
TRACK_RADIUS_B = 1.8
GATE_RADIUS    = 24.0
GATE_TUBE_R    = 1.2
STEPS_PER_SEG  = 80


# ── Helper: cubic Bezier sample ───────────────────────────────────────────────
def cubic_bez(p0, c1, c2, p3, t):
    u = 1 - t
    x = u**3*p0[0] + 3*u**2*t*c1[0] + 3*u*t**2*c2[0] + t**3*p3[0]
    y = u**3*p0[1] + 3*u**2*t*c1[1] + 3*u*t**2*c2[1] + t**3*p3[1]
    return x, y


def sample_circuit(steps_per_seg=STEPS_PER_SEG):
    """Return list of (x, z) in SVG pixel coords for the full circuit."""
    pts = []
    for p0, c1, c2, p3 in SEGS:
        p0s = (p0[0]*W, p0[1]*H)
        c1s = (c1[0]*W, c1[1]*H)
        c2s = (c2[0]*W, c2[1]*H)
        p3s = (p3[0]*W, p3[1]*H)
        for i in range(steps_per_seg):
            t = i / steps_per_seg
            x, z = cubic_bez(p0s, c1s, c2s, p3s, t)
            pts.append((x - W/2, z - H/2))   # centre at origin (subtract 400, 275)
    return pts


# ── Material factory ──────────────────────────────────────────────────────────
def make_emissive_mat(name, color_rgb, strength=3.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out   = nodes.new('ShaderNodeOutputMaterial')
    emit  = nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value    = (*color_rgb, alpha)
    emit.inputs['Strength'].default_value = strength
    links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat


def make_ground_mat():
    mat = bpy.data.materials.new(name='MRCP_Ground')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out   = nodes.new('ShaderNodeOutputMaterial')
    bsdf  = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value    = (0.008, 0.031, 0.063, 1.0)
    bsdf.inputs['Roughness'].default_value     = 0.9
    bsdf.inputs['Metallic'].default_value      = 0.0

    # Grid texture overlay
    tex   = nodes.new('ShaderNodeTexChecker')
    tex.inputs['Color1'].default_value = (0.012, 0.047, 0.094, 1.0)
    tex.inputs['Color2'].default_value = (0.000, 0.212, 0.314, 1.0)
    tex.inputs['Scale'].default_value  = 20.0

    mix   = nodes.new('ShaderNodeMixRGB')
    mix.inputs['Fac'].default_value = 0.15
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    links.new(tex.outputs['Color'], mix.inputs[2])
    return mat


def make_band_mat(color_rgb, alpha=0.08):
    mat = bpy.data.materials.new(name=f'MRCP_Band_{color_rgb[0]:.2f}')
    mat.use_nodes = True
    mat.blend_method = 'BLEND'
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out   = nodes.new('ShaderNodeOutputMaterial')
    bsdf  = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value  = (*color_rgb, 1.0)
    bsdf.inputs['Alpha'].default_value       = alpha
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


# ── Build track tube ──────────────────────────────────────────────────────────
def build_track(pts_2d, alt_y, tube_r, mat, name):
    """
    Extrudes a circle along the circuit path at altitude alt_y.
    pts_2d: list of (x, z) centred at origin.
    """
    curve_data = bpy.data.curves.new(name=name, type='CURVE')
    curve_data.dimensions       = '3D'
    curve_data.bevel_depth      = tube_r
    curve_data.bevel_resolution = 5
    curve_data.use_fill_caps    = True

    spline = curve_data.splines.new('POLY')
    spline.points.add(len(pts_2d) - 1)
    for i, (x, z) in enumerate(pts_2d):
        spline.points[i].co = (x, alt_y, z, 1.0)
    spline.use_cyclic_u = True

    obj = bpy.data.objects.new(name, curve_data)
    obj.data.materials.append(mat)
    bpy.context.collection.objects.link(obj)
    return obj


# ── Build gate torus ──────────────────────────────────────────────────────────
def build_gate(gk, gdata, alt_y, mat):
    cx = gdata['x'] * W - W/2
    cz = gdata['y'] * H - H/2

    bpy.ops.mesh.primitive_torus_add(
        major_radius=GATE_RADIUS, minor_radius=GATE_TUBE_R,
        major_segments=48, minor_segments=12,
        location=(cx, alt_y, cz)
    )
    obj = bpy.context.active_object
    obj.name = f'Gate_{gk}'
    obj.data.materials.append(mat)

    # Vertical torus: rotate 90° around X so ring stands upright (faces the path)
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    return obj


# ── Ground plane ─────────────────────────────────────────────────────────────
def build_ground():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -2, 0))
    obj = bpy.context.active_object
    obj.name = 'Ground'
    obj.scale = (W * 0.7, H * 0.7, 1)
    bpy.ops.object.transform_apply(scale=True)
    # Rotate flat: Blender plane is in XY, we need XZ
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_ground_mat()
    obj.data.materials.append(mat)
    return obj


# ── Airspace band planes ──────────────────────────────────────────────────────
def build_band(alt_y, color_rgb, name):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, alt_y, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (W * 0.65, H * 0.65, 1)
    bpy.ops.object.transform_apply(scale=True)
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_band_mat(color_rgb, alpha=0.06)
    obj.data.materials.append(mat)
    return obj


# ────────────────────────────────────────────────────────────────────────────
# MAIN BUILD
# ────────────────────────────────────────────────────────────────────────────

pts = sample_circuit()

# Tracks
mat_a = make_emissive_mat('Track_ClassA', (1.0, 0.420, 0.0),   strength=4.0)
mat_b = make_emissive_mat('Track_ClassB', (0.0, 0.831, 1.0),   strength=4.0)
track_a = build_track(pts, CLASS_A_ALT, TRACK_RADIUS_A, mat_a, 'Track_ClassA')
track_b = build_track(pts, CLASS_B_ALT, TRACK_RADIUS_B, mat_b, 'Track_ClassB')

# Gates — dual rings at both altitude bands
for gk, gdata in GATES.items():
    mat_gate_a = make_emissive_mat(f'Gate_{gk}_A', gdata['color'], strength=5.0)
    mat_gate_b = make_emissive_mat(f'Gate_{gk}_B', gdata['color'], strength=5.0)
    build_gate(gk, gdata, CLASS_A_ALT, mat_gate_a)
    build_gate(gk + '_B', gdata, CLASS_B_ALT, mat_gate_b)

# Ground & airspace bands
build_ground()
build_band(CLASS_A_ALT, (1.0, 0.420, 0.0), 'Band_ClassA')
build_band(CLASS_B_ALT, (0.0, 0.831, 1.0), 'Band_ClassB')
build_band(BUFFER_ALT,  (1.0, 0.722, 0.0), 'Band_Buffer')   # 30-35m buffer zone

# ── Camera for presentation renders ──────────────────────────────────────────
cam_data = bpy.data.cameras.new('MRCP_Camera')
cam_data.lens = 40
cam_obj = bpy.data.objects.new('MRCP_Camera', cam_data)
cam_obj.location = (0, 420, 460)
cam_obj.rotation_euler = (math.radians(42), 0, 0)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# ── World — dark environment ──────────────────────────────────────────────────
world = bpy.context.scene.world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Color'].default_value    = (0.004, 0.008, 0.016, 1.0)
    bg.inputs['Strength'].default_value = 0.5

# ── Render settings (Cycles, 1920×1080) ──────────────────────────────────────
scene = bpy.context.scene
scene.render.engine           = 'CYCLES'
scene.cycles.samples          = 128
scene.render.resolution_x     = 1920
scene.render.resolution_y     = 1080
scene.render.film_transparent = False

print("✓ MRCP Circuit built successfully.")
print("  → Export: File > Export > glTF 2.0 > mrcp-circuit.glb")
print("  → Render: Render > Render Image  (F12)")
