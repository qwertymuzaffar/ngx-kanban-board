import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import type { CardMovedEvent, KanbanCard, KanbanColumn } from './kanban.models';

/**
 * Drag-and-drop kanban board built on Angular CDK.
 *
 * The component treats `columns` as its working model and emits
 * `cardMoved` / `columnsChange` after every drop, so consumers can
 * persist changes or run the board fully controlled.
 */
@Component({
  selector: 'ngx-kanban-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss',
})
export class KanbanBoardComponent {
  columns = input.required<KanbanColumn[]>();
  /** Disables all dragging (read-only board). */
  disabled = input(false);

  cardMoved = output<CardMovedEvent>();
  cardClicked = output<KanbanCard>();
  columnsChange = output<KanbanColumn[]>();

  readonly overLimit = computed(() =>
    new Set(
      this.columns()
        .filter((c) => c.wipLimit !== undefined && c.cards.length > c.wipLimit)
        .map((c) => c.id),
    ),
  );

  onDrop(event: CdkDragDrop<KanbanCard[]>, target: KanbanColumn): void {
    const source = this.columns().find((c) => c.cards === event.previousContainer.data);
    if (!source) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(target.cards, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.cardMoved.emit({
      card: target.cards[event.currentIndex],
      fromColumnId: source.id,
      toColumnId: target.id,
      toIndex: event.currentIndex,
    });
    this.columnsChange.emit(this.columns());
  }
}
