#!/bin/bash
# Run this to regenerate icons if you have rsvg-convert or Inkscape installed
# Otherwise use the inline PNG approach below
cat > /tmp/tabkeeper_icon.svg << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c63ff"/>
      <stop offset="100%" stop-color="#ff6584"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <rect x="20" y="36" width="88" height="16" rx="5" fill="white" opacity="0.9"/>
  <rect x="20" y="60" width="88" height="16" rx="5" fill="white" opacity="0.7"/>
  <rect x="20" y="84" width="60" height="16" rx="5" fill="white" opacity="0.5"/>
</svg>
SVG

echo "SVG icon created at /tmp/tabkeeper_icon.svg"
