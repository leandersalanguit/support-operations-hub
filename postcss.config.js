/**
 * @fileoverview PostCSS configuration.
 * Registers plugins used for CSS processing, primarily Tailwind CSS and Autoprefixer,
 * to ensure modern CSS is transformed properly across different browsers.
 */

export default {
  plugins: {
    // Process Tailwind utility classes
    tailwindcss: {},
    // Add vendor prefixes to CSS rules
    autoprefixer: {},
  },
}
