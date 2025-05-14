declare module 'react-simple-maps' {
  import { ReactNode } from 'react';

  export interface GeographyProps {
    geography: any;
    projection?: (coords: [number, number]) => [number, number];
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      rotation?: [number, number, number];
      parallels?: [number, number];
    };
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: any[] }) => ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
}

declare module 'd3-scale' {
  export function scaleQuantize<Range>(): {
    domain: (domain: [number, number]) => any;
    range: (range: Range[]) => any;
  };
} 