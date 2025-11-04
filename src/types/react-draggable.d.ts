declare module 'react-draggable' {
  import { Component } from 'react';
  
  interface DraggableProps {
    handle?: string;
    bounds?: string | { left?: number; right?: number; top?: number; bottom?: number };
    cancel?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export default class Draggable extends Component<DraggableProps> {}
}
