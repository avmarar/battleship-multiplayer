export const GRID_SIZE = 10;

export const GRID_COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
] as const;

export const GRID_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type GridColumn = (typeof GRID_COLUMNS)[number];
export type GridRow = (typeof GRID_ROWS)[number];
export type GridCoordinate = `${GridColumn}${GridRow}`;

export type GridIndices = {
  col: number;
  row: number;
};

const COORDINATE_PATTERN = /^([A-J])(10|[1-9])$/;

export function coordinateFromIndices(
  col: number,
  row: number
): GridCoordinate {
  if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
    throw new RangeError(
      `Grid indices out of range: col=${col}, row=${row}`
    );
  }

  return `${GRID_COLUMNS[col]}${GRID_ROWS[row]}`;
}

export function isGridCoordinate(value: string): value is GridCoordinate {
  return COORDINATE_PATTERN.test(value);
}

export function indicesFromCoordinate(
  coordinate: string
): GridIndices | null {
  if (!isGridCoordinate(coordinate)) {
    return null;
  }

  const column = coordinate[0] as GridColumn;
  const rowLabel = Number(coordinate.slice(1)) as GridRow;
  return {
    col: GRID_COLUMNS.indexOf(column),
    row: GRID_ROWS.indexOf(rowLabel),
  };
}

export function clampGridIndex(value: number): number {
  return Math.max(0, Math.min(GRID_SIZE - 1, value));
}
