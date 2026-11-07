import qrcode from "qrcode-generator";

export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const grid: boolean[][] = [];
  for (let row = 0; row < n; row += 1) {
    const cells: boolean[] = [];
    for (let col = 0; col < n; col += 1) cells.push(qr.isDark(row, col));
    grid.push(cells);
  }
  return grid;
}
