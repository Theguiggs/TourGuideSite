import L from 'leaflet';

interface NumberedIconOpts {
  number: number | string;
  fillColor: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  size?: number;
  fontSize?: number;
  fontWeight?: number;
  shadow?: boolean;
  zIndex?: number;
}

export function createNumberedIcon(opts: NumberedIconOpts): L.DivIcon {
  const {
    number,
    fillColor,
    textColor = '#ffffff',
    borderColor = '#ffffff',
    borderWidth = 2,
    size = 28,
    fontSize = 12,
    fontWeight = 700,
    shadow = true,
  } = opts;
  const html = `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${fillColor};color:${textColor};
    display:flex;align-items:center;justify-content:center;
    font-size:${fontSize}px;font-weight:${fontWeight};font-family:inherit;line-height:1;
    border:${borderWidth}px solid ${borderColor};
    ${shadow ? 'box-shadow:0 1px 4px rgba(0,0,0,.25);' : ''}
    box-sizing:border-box;
  ">${number}</div>`;
  return L.divIcon({
    className: 'tg-numbered-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface DotIconOpts {
  fillColor: string;
  borderColor?: string;
  borderWidth?: number;
  size?: number;
  opacity?: number;
  shadow?: boolean;
  cursor?: string;
}

export function createDotIcon(opts: DotIconOpts): L.DivIcon {
  const {
    fillColor,
    borderColor = '#ffffff',
    borderWidth = 2,
    size = 14,
    opacity = 1,
    shadow = false,
    cursor = 'grab',
  } = opts;
  const html = `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${fillColor};opacity:${opacity};
    border:${borderWidth}px solid ${borderColor};
    ${shadow ? 'box-shadow:0 1px 3px rgba(0,0,0,.2);' : ''}
    cursor:${cursor};
    box-sizing:border-box;
  "></div>`;
  return L.divIcon({
    className: 'tg-dot-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
