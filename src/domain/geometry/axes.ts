// FR-8.7: the orientation triad, as arithmetic.
//
// Three unit axes carried through the same rotation the character is, and read
// back as screen positions plus the depth that decides which is drawn on top.
// Pure — it knows nothing about SVG, colour or corners of a stage.
import { rotatePoint, turnAngles } from "./projection";

export interface TriadAxis {
  name: "x" | "y" | "z";
  /** Where the axis ends, in screen units from the origin. */
  tip: { x: number; y: number };
  /**
   * How far toward the viewer that end points, from −1 (straight away) to 1
   * (straight at them). Stays normalised whatever the radius, because it
   * decides paint order rather than size.
   */
  depth: number;
}

/**
 * The three axes under `rotation`, scaled to `radius`, sorted back to front.
 *
 * `perspective` is 1 here where a body would pass its own: the triad reports
 * the rotation rather than being a thing seen under it, so damping the angle
 * would make it disagree with the numbers beside it.
 */
export function axisTriad(
  rotation: { x: number; y: number; z: number },
  radius: number,
): TriadAxis[] {
  const turn = turnAngles(1, rotation);
  // Screen y runs downward, so the up axis is the negative one — the same
  // convention the scene's own vertical follows.
  const units: [TriadAxis["name"], number, number, number][] = [
    ["x", 1, 0, 0],
    ["y", 0, -1, 0],
    ["z", 0, 0, 1],
  ];
  return units
    .map(([name, x, y, z]) => {
      const p = rotatePoint(x, y, z, turn);
      return {
        name,
        tip: { x: p.x * radius, y: p.y * radius },
        depth: p.z,
      };
    })
    .sort((a, b) => a.depth - b.depth);
}
