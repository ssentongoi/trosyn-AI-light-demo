declare module '@editorjs/checklist' {
  import { BlockToolConstructable } from '@editorjs/editorjs';
  const Checklist: BlockToolConstructable;
  export default Checklist;
}

declare module '@editorjs/link' {
  import { InlineToolConstructable } from '@editorjs/editorjs';
  const LinkTool: InlineToolConstructable;
  export default LinkTool;
}

declare module '@editorjs/header' {
  import { BlockToolConstructable } from '@editorjs/editorjs';
  const Header: BlockToolConstructable;
  export default Header;
}

declare module '@editorjs/paragraph' {
  import { BlockToolConstructable } from '@editorjs/editorjs';
  const Paragraph: BlockToolConstructable;
  export default Paragraph;
}

declare module '@editorjs/list' {
  import { BlockToolConstructable } from '@editorjs/editorjs';
  const List: BlockToolConstructable;
  export default List;
}

declare module '@editorjs/table' {
  import { BlockToolConstructable } from '@editorjs/editorjs';
  const Table: BlockToolConstructable;
  export default Table;
}

declare module '@editorjs/marker' {
  import { InlineToolConstructable } from '@editorjs/editorjs';
  const Marker: InlineToolConstructable;
  export default Marker;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
