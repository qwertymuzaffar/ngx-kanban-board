export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  color?: string;
  /** Arbitrary consumer data carried through drag/drop events. */
  data?: unknown;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  /** Work-in-progress limit; the column highlights when exceeded. */
  wipLimit?: number;
  color?: string;
}

export interface CardMovedEvent {
  card: KanbanCard;
  fromColumnId: string;
  toColumnId: string;
  toIndex: number;
}

export interface ColumnRenamedEvent {
  columnId: string;
  title: string;
  previousTitle: string;
}

export interface CardAddedEvent {
  /** The card the board created; replace its generated id if you need your own. */
  card: KanbanCard;
  columnId: string;
}
