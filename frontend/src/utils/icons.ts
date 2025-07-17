import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

// Define the props type for our icon components
interface IconProps extends SvgIconProps {
  // Add any additional props specific to our icons here
}

// Document icon component
export const DocIcon: React.FC<IconProps> = (props) => {
  return React.createElement(
    SvgIcon,
    props,
    React.createElement('path', {
      d: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
    })
  );
}

// Description outlined icon component
export const DescriptionOutlinedIcon: React.FC<IconProps> = (props) => {
  return React.createElement(
    SvgIcon,
    props,
    React.createElement('path', {
      d: 'M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z'
    })
  );
}
