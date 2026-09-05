# ngx-kanban-board

Drag-and-drop kanban board component for Angular - built on Angular CDK, with a signals-based API, WIP limits, and CSS-custom-property theming. Zero dependencies beyond `@angular/cdk`.

## Features

- **Drag & drop** across and within columns (Angular CDK `DropListGroup`)
- **WIP limits** - columns highlight and badge in red when over their `wipLimit`
- **Signals API** - `input()`/`output()` based, `OnPush`, works controlled or uncontrolled
- **Themeable** - every color and radius is a `--nkb-*` CSS custom property (dark theme = a few variables)
- **Tested & documented** - 95%+ unit-test coverage, Storybook stories for every state

## Install

```bash
npm install ngx-kanban-board @angular/cdk
```

## Usage

```ts
import { KanbanBoardComponent, KanbanColumn, CardMovedEvent } from 'ngx-kanban-board';

@Component({
  imports: [KanbanBoardComponent],
  template: `<ngx-kanban-board [columns]="columns" (cardMoved)="persist($event)" />`,
})
export class BoardPage {
  columns: KanbanColumn[] = [
    { id: 'todo', title: 'To Do', cards: [{ id: '1', title: 'First task' }] },
    { id: 'doing', title: 'Doing', wipLimit: 3, cards: [] },
    { id: 'done', title: 'Done', cards: [] },
  ];

  persist(e: CardMovedEvent) { /* e.card, e.fromColumnId, e.toColumnId, e.toIndex */ }
}
```

## API

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `columns` | `KanbanColumn[]` | required | Board model; mutated in place on drop |
| `disabled` | `boolean` | `false` | Read-only board (dragging off) |

### Outputs

| Output | Payload | Fires |
|---|---|---|
| `cardMoved` | `CardMovedEvent` | After any drop (reorder or transfer) |
| `cardClicked` | `KanbanCard` | Card click |
| `columnsChange` | `KanbanColumn[]` | After any drop, with the updated model |

### Theming

Override CSS custom properties on the host or any ancestor:

```css
ngx-kanban-board {
  --nkb-bg: #0f172a;
  --nkb-column-bg: #1e293b;
  --nkb-card-bg: #273449;
  --nkb-ink: #e2e8f0;
  --nkb-accent: #38bdf8;
}
```

Full list in `kanban-board.component.scss`.

## Development

```bash
npm start                          # demo app
ng test ngx-kanban-board           # unit tests (vitest)
ng run demo:storybook              # storybook
```

Requires Node 22+ and Angular 19+.

## License

MIT
