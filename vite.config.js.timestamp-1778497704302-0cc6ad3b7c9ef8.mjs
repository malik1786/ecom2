// vite.config.js
import { defineConfig } from "file:///C:/Users/HP/Desktop/Malik/bussiness%20works/sufi%20perfume%20-%20Copy/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/HP/Desktop/Malik/bussiness%20works/sufi%20perfume%20-%20Copy/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/logs": {
        target: "http://127.0.0.1:5004",
        changeOrigin: true,
        proxyTimeout: 0,
        // Prevent timeout for long-lived SSE
        timeout: 0
      },
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        headers: { "x-internal-secret": "SUPER_SECRET_INTERNAL_KEY_123" },
        rewrite: (path) => path.replace(/^\/api\/api(\/|$)/, "/api$1")
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      },
      "/auth": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        headers: { "x-internal-secret": "SUPER_SECRET_INTERNAL_KEY_123" }
      },
      "/payment": {
        target: "http://127.0.0.1:5002",
        changeOrigin: true,
        headers: { "x-internal-secret": "SUPER_SECRET_INTERNAL_KEY_123" }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIUFxcXFxEZXNrdG9wXFxcXE1hbGlrXFxcXGJ1c3NpbmVzcyB3b3Jrc1xcXFxzdWZpIHBlcmZ1bWUgLSBDb3B5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIUFxcXFxEZXNrdG9wXFxcXE1hbGlrXFxcXGJ1c3NpbmVzcyB3b3Jrc1xcXFxzdWZpIHBlcmZ1bWUgLSBDb3B5XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9IUC9EZXNrdG9wL01hbGlrL2J1c3NpbmVzcyUyMHdvcmtzL3N1ZmklMjBwZXJmdW1lJTIwLSUyMENvcHkvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgcG9ydDogNTE3MyxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGkvbG9ncyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo1MDA0JyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBwcm94eVRpbWVvdXQ6IDAsIC8vIFByZXZlbnQgdGltZW91dCBmb3IgbG9uZy1saXZlZCBTU0VcbiAgICAgICAgdGltZW91dDogMCxcbiAgICAgIH0sXG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo1MDAwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7ICd4LWludGVybmFsLXNlY3JldCc6ICdTVVBFUl9TRUNSRVRfSU5URVJOQUxfS0VZXzEyMycgfSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL2FwaShcXC98JCkvLCAnL2FwaSQxJyksXG4gICAgICB9LFxuICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgICAgJy9hdXRoJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjUwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHsgJ3gtaW50ZXJuYWwtc2VjcmV0JzogJ1NVUEVSX1NFQ1JFVF9JTlRFUk5BTF9LRVlfMTIzJyB9LFxuICAgICAgfSxcbiAgICAgICcvcGF5bWVudCc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo1MDAyJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7ICd4LWludGVybmFsLXNlY3JldCc6ICdTVVBFUl9TRUNSRVRfSU5URVJOQUxfS0VZXzEyMycgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStYLFNBQVMsb0JBQW9CO0FBQzVaLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsYUFBYTtBQUFBLFFBQ1gsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsY0FBYztBQUFBO0FBQUEsUUFDZCxTQUFTO0FBQUEsTUFDWDtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxFQUFFLHFCQUFxQixnQ0FBZ0M7QUFBQSxRQUNoRSxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEscUJBQXFCLFFBQVE7QUFBQSxNQUMvRDtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLEVBQUUscUJBQXFCLGdDQUFnQztBQUFBLE1BQ2xFO0FBQUEsTUFDQSxZQUFZO0FBQUEsUUFDVixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLEVBQUUscUJBQXFCLGdDQUFnQztBQUFBLE1BQ2xFO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
