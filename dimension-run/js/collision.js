/* Collision detection between the player and one obstacle cell. Only the ACTIVE world's
   cells are ever tested, which is what makes switching dimensions a survival tool. */
(function (root) {
  'use strict';
  const DR = root.DR;
  const C = DR.CONST;

  /**
   * @param cell   obstacle cell ({type, ...})
   * @param lane   lane of the cell (-1..1)
   * @param dz     row distance minus player distance (m)
   * @param P      DR.Player
   * @returns null | 'block' | 'bounce' | 'low' | 'high' | 'gap'
   */
  function testCell(cell, lane, dz, P) {
    const adz = Math.abs(dz);
    const half = C.DEPTH[cell.type] / 2;
    if (cell.type === 'block') {
      if (adz >= half) return null;
      const x = lane * C.LANE_W;
      if (Math.abs(P.lat - x) >= C.BLOCK_HALF_W) return null;
      // We were outside the block's width a moment ago: we ran into its side.
      return Math.abs(P.prevLat - x) >= C.BLOCK_HALF_W ? 'bounce' : 'block';
    }
    if (P.laneOfLat !== lane) return null;
    switch (cell.type) {
      case 'low': return adz < half && P.y < C.CLEAR_LOW ? 'low' : null;
      case 'high': return adz < half && !P.sliding ? 'high' : null;
      case 'gap': return adz < half - 0.35 && P.grounded ? 'gap' : null;
    }
    return null;
  }

  /** Test every cell of a row in the given world; returns the first hit or null. */
  function testRow(row, world, P) {
    const dz = row.d - P.d;
    if (Math.abs(dz) > row.depth / 2 + 0.1) return null;
    const cells = row.cells[world];
    for (let i = 0; i < 3; i++) {
      const c = cells[i];
      if (!c) continue;
      const hit = testCell(c, i - 1, dz, P);
      if (hit) return { hit, lane: i - 1, cell: c };
    }
    return null;
  }

  DR.collision = { testCell, testRow };
})(typeof window !== 'undefined' ? window : globalThis);
