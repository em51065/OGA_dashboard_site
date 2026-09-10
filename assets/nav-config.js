(function () {
  "use strict";

  /** Sync with config/explorer-layout.json — do not change without updating JSON + tests. */
  const COMPACT_MAX_WIDTH = 760;

  const CUSTOM_ICONS = {
    circularity: `<svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 3.4a8.6 8.6 0 0 1 7.45 4.3"></path>
              <path d="M19.7 4.7 20.15 8.8 16.15 7.75"></path>
              <path d="M19.45 13.1a8.6 8.6 0 0 1-7.45 7.5"></path>
              <path d="M15.35 20.35 11.55 21.65 12.45 17.65"></path>
              <path d="M8.05 19.65a8.6 8.6 0 0 1-.05-15.3"></path>
              <path d="M4.35 7.25 6.9 4.05 8.35 7.9"></path>
            </svg>`,
    streetlight: `<svg viewBox="0 0 24 24" focusable="false">
                <path d="M9 21h6"></path>
                <path d="M12 21V9.4"></path>
                <path d="M12 9.4c0-3.1 2.3-5.4 5.3-5.4h2.2"></path>
                <path d="M17.7 4v4.2"></path>
                <path d="M15.4 8.2h4.8"></path>
                <path d="M16.4 8.2 15.3 11h5l-1.1-2.8"></path>
              </svg>`,
  };

  const NAV_THEMES = [
    {
      id: "circularity",
      eyebrow: "減廢循環",
      title: "減廢與循環",
      dotLabel: "減廢與循環",
      icon: { type: "custom", key: "circularity", className: "oga-circularity-icon" },
      charts: [
        { id: "ecoco", label: "ECOCO", icon: { type: "lucide", name: "recycle" } },
        { id: "general-recycle", label: "一般回收", icon: { type: "lucide", name: "trash-2" } },
        { id: "resource-recycle", label: "資源回收", icon: { type: "lucide", name: "package-open" } },
        { id: "food-waste-recycle", label: "廚餘回收", icon: { type: "lucide", name: "apple" } },
      ],
    },
    {
      id: "energy-water",
      eyebrow: "能源與水",
      title: "能源與水資源",
      dotLabel: "能源與水資源",
      icon: { type: "lucide", name: "waves" },
      charts: [
        { id: "rainwater-reuse", label: "中軸雨水回收", icon: { type: "lucide", name: "cloud-rain" } },
        { id: "water-use", label: "用水量", icon: { type: "lucide", name: "droplets" } },
        { id: "electricity-use", label: "用電量", icon: { type: "lucide", name: "zap" } },
        { id: "solar-energy", label: "太陽能", icon: { type: "lucide", name: "sun" } },
      ],
    },
    {
      id: "replacement",
      eyebrow: "設備更新",
      title: "節能汰換",
      dotLabel: "節能汰換",
      icon: { type: "lucide", name: "lightbulb" },
      charts: [
        { id: "ac-replacement", label: "冷氣汰換", icon: { type: "lucide", name: "air-vent" } },
        { id: "led-replacement", label: "LED燈具汰換", icon: { type: "lucide", name: "lamp-ceiling" } },
        {
          id: "streetlight-replacement",
          label: "路燈汰換",
          icon: { type: "custom", key: "streetlight", className: "oga-streetlight-icon" },
        },
      ],
    },
    {
      id: "friendly-spaces",
      eyebrow: "校園生活",
      title: "共融空間",
      dotLabel: "共融空間",
      icon: { type: "lucide", name: "users-round" },
      charts: [
        { id: "friendly-spaces", label: "友善設施", icon: { type: "lucide", name: "heart-handshake" } },
        { id: "mobility-hubs", label: "行動據點", icon: { type: "lucide", name: "bike" }, soon: true },
        { id: "green-building", label: "綠色建築", icon: { type: "lucide", name: "trees" }, soon: true },
      ],
    },
  ];

  window.OGA_NAV = { COMPACT_MAX_WIDTH, CUSTOM_ICONS, NAV_THEMES };
})();
