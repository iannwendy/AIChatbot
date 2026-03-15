import * as React from 'react';

declare module 'react-icons/lib' {
  export type IconType = (props: React.SVGAttributes<SVGElement> & {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
  }) => React.JSX.Element;
}
