declare module '@editorjs/marker' {
  import { InlineTool } from '@editorjs/editorjs';
  
  export default class Marker implements InlineTool {
    static get isInline(): boolean;
    static get shortcut(): string;
    static get sanitize(): { mark: boolean };
    
    render(): HTMLElement;
    surround(range: Range): void;
    checkState(selection: Selection): boolean;
    clear(): void;
  }
}
