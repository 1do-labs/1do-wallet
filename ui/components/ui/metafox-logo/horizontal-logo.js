import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ThemeType } from '../../../../shared/constants/preferences';

const LOGO_WIDTH = 88;
const LOGO_HEIGHT = 24;

export default function MetaFoxHorizontalLogo({
  theme: themeProps,
  className,
}) {
  const [theme, setTheme] = useState(() =>
    themeProps === undefined
      ? document.documentElement.getAttribute('data-theme')
      : themeProps,
  );

  const fill = theme === ThemeType.dark ? 'rgb(255,255,255)' : 'rgb(22,22,22)';

  useEffect(() => {
    let newTheme = themeProps;
    if (newTheme === undefined) {
      newTheme = document.documentElement.getAttribute('data-theme');
    }
    setTheme(newTheme);
  }, [themeProps, setTheme]);

  return (
    <svg
      height={LOGO_HEIGHT}
      width={LOGO_WIDTH}
      viewBox="0 0 88 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <text
        x="0"
        y="18"
        fill={fill}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="20"
        fontWeight="700"
        letterSpacing="-0.06em"
      >
        1do
      </text>
    </svg>
  );
}

MetaFoxHorizontalLogo.propTypes = {
  theme: PropTypes.oneOf([ThemeType.light, ThemeType.dark, ThemeType.os]),
  className: PropTypes.string,
};
