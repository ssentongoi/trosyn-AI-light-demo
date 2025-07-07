declare module '@editorjs/header' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export interface HeaderConfig {
    placeholder?: string;
    levels?: number[];
    defaultLevel?: number;
  }
  
  export default class Header implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<HeaderConfig> });
    render(): HTMLElement;
    save(block: HTMLElement): { text: string; level: number };
  }
}

declare module '@editorjs/list' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export interface ListConfig {
    defaultStyle?: 'ordered' | 'unordered';
  }
  
  export default class List implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<ListConfig> });
    render(): HTMLElement;
    save(block: HTMLElement): { style: string; items: string[] };
  }
}

declare module '@editorjs/table' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export interface TableConfig {
    rows?: number;
    cols?: number;
  }
  
  export default class Table implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<TableConfig> });
    render(): HTMLElement;
    save(block: HTMLElement): { content: string[][]; withHeadings: boolean };
  }
}

declare module '@editorjs/checklist' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export interface ChecklistItem {
    text: string;
    checked: boolean;
  }
  
  export default class Checklist implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<{ items: ChecklistItem[] }> });
    render(): HTMLElement;
    save(block: HTMLElement): { items: ChecklistItem[] };
  }
}

declare module '@editorjs/code' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export default class Code implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<{ code: string }> });
    render(): HTMLElement;
    save(block: HTMLElement): { code: string };
  }
}

declare module '@editorjs/quote' {
  import { BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
  
  export interface QuoteData {
    text: string;
    caption?: string;
    alignment?: 'left' | 'center';
  }
  
  export default class Quote implements BlockTool {
    constructor(config?: { data: BlockToolConstructorOptions<QuoteData> });
    render(): HTMLElement;
    save(block: HTMLElement): QuoteData;
  }
}
