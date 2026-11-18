import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Filter, MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../../lib/constants';

// Default constituency coordinates dictionary for realistic centering
const CONSTITUENCY_COORDINATES = {
  'Lucknow Central': [26.8467, 80.9462],
  'Lucknow Cantt': [26.8200, 80.9300],
  'Lucknow North': [26.8900, 80.9500],
  'Lucknow East': [26.8600, 80.9800],
  'Lucknow West': [26.8500, 80.8900],
  'Bakshi Kaa Talab': [27.0100, 80.9100],
  'Sarojini Nagar': [26.7400, 80.8600],
  'Noida': [28.5355, 77.3910],
  'Dadri': [28.5500, 77.5500],
  'Jewar': [28.1300, 77.5600],
  'Varanasi Cantt': [25.3200, 82.9800],
  'Varanasi North': [25.3400, 83.0100],
  'Varanasi South': [25.3000, 83.0000],
  'Shantinagar': [12.9600, 77.5900],
  'Shivajinagar': [12.9850, 77.6050],
  'BTM Layout': [12.9165, 77.6101],
  'Malleshwaram': [13.0055, 77.5692],
};

function getPriorityColor(priority) {
  switch (priority) {
    case 'urgent':
      return '#e11d48'; // rose-600
    case 'high':
      return '#ea580c'; // orange-600
    case 'medium':
      return '#0284c7'; // sky-600
    case 'low':
      return '#64748b'; // slate-500
    default:
      return '#0284c7';
  }
}

export default function ConstituencyHeatmap({
  complaints = [],
  constituency = '',
  onSelectComplaint,
  privacyPrecision = 6,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('markers'); // 'markers' | 'density'

  const centerCoords = useMemo(() => {
    return CONSTITUENCY_COORDINATES[constituency] || [20.5937, 78.9629];
  }, [constituency]);

  // Compute filtered complaints with valid or derived coordinates
  const mappedPoints = useMemo(() => {
    return complaints
      .filter((c) => {
        const matchCat = !selectedCategory || c.category === selectedCategory;
        const matchPriority = !selectedPriority || c.priority === selectedPriority;
        const matchStatus = !selectedStatus || c.status === selectedStatus;
        const date = c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : '';
        const matchFrom = !dateFrom || (date && date >= dateFrom);
        const matchTo = !dateTo || (date && date <= dateTo);
        const lat = Number(c.latitude);
        const lng = Number(c.longitude);
        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)
          && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
          && (lat !== 0 || lng !== 0);
        return matchCat && matchPriority && matchStatus && matchFrom && matchTo && hasCoordinates;
      })
      .map((c) => ({
        ...c,
        computedLat: Number(Number(c.latitude).toFixed(privacyPrecision)),
        computedLng: Number(Number(c.longitude).toFixed(privacyPrecision)),
      }));
  }, [complaints, selectedCategory, selectedPriority, selectedStatus, dateFrom, dateTo, privacyPrecision]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(centerCoords, 13);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [centerCoords]);

  // Render markers / density layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (viewMode === 'density') {
      // Build heatmap points: [lat, lng, intensity]
      const heatPoints = mappedPoints.map((point) => {
        const intensity =
          point.priority === 'urgent' ? 1.0
          : point.priority === 'high' ? 0.7
          : point.priority === 'medium' ? 0.4
          : 0.2;
        return [point.computedLat, point.computedLng, intensity];
      });

      if (heatPoints.length > 0) {
        const heatLayer = L.heatLayer(heatPoints, {
          radius: 28,
          blur: 18,
          maxZoom: 17,
          max: 1.0,
          gradient: { 0.2: '#38bdf8', 0.4: '#a3e635', 0.65: '#fbbf24', 1.0: '#e11d48' },
        });
        layerGroup.addLayer(heatLayer);
      }
    } else {
      mappedPoints.forEach((point) => {
        const color = getPriorityColor(point.priority);
        // Render custom styled pin markers
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 10px;
              font-weight: bold;
              cursor: pointer;
            ">
              ${point.priority === 'urgent' ? '!' : '•'}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([point.computedLat, point.computedLng], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 space-y-1 font-sans text-xs';
        const popupTitle = document.createElement('p');
        popupTitle.className = 'font-bold text-slate-900 leading-tight';
        popupTitle.textContent = point.title || 'Public complaint';
        const popupTicket = document.createElement('p');
        popupTicket.className = 'text-[10px] text-slate-500 font-mono';
        popupTicket.textContent = point.tracking_id || point.id.slice(0, 8);
        const popupDetails = document.createElement('p');
        popupDetails.className = 'text-[11px] text-slate-600 pt-1';
        popupDetails.textContent = `${point.priority || 'unassigned'} · ${point.status || 'unknown'} · ${point.landmark || point.constituency || ''}`;
        popupContent.append(popupTitle, popupTicket, popupDetails);

        const btn = document.createElement('button');
        btn.innerText = 'View Ticket Details';
        btn.className = 'w-full mt-2 py-1 px-2 rounded-lg text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer text-center';
        btn.onclick = () => {
          if (onSelectComplaint) onSelectComplaint(point);
        };
        popupContent.appendChild(btn);

        marker.bindPopup(popupContent, { maxWidth: 260 });
        layerGroup.addLayer(marker);
      });
    }
  }, [mappedPoints, viewMode, onSelectComplaint]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => mapInstanceRef.current?.setView(centerCoords, 13);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-600" />
            Constituency Grievance Heatmap &amp; Geographical Analytics
          </h3>
          <p className="text-xs text-slate-500">
            Uses complaint coordinates stored in the database. Reports without valid coordinates are omitted.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {Object.entries(COMPLAINT_STATUSES).map(([key, cfg]) => (
              <option key={key} value={key.toLowerCase()}>
                {cfg.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 text-[10px] text-slate-500">
            From<input aria-label="Filter from date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-1.5 py-1" />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-500">
            To<input aria-label="Filter to date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-1.5 py-1" />
          </label>

          {/* Toggle markers vs density */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('markers')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'markers' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pins
            </button>
            <button
              type="button"
              onClick={() => setViewMode('density')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'density' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Heat Radii
            </button>
          </div>
        </div>
      </div>

      {/* Map Display */}
      <div className="relative w-full h-80 sm:h-96 bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Overlay Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Recenter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          {viewMode === 'density' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-16 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #38bdf8, #a3e635, #fbbf24, #e11d48)' }} />
              </div>
              <span className="text-slate-500">Low → High Density</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>Urgent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Low</span>
              </div>
            </>
          )}
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-800">{mappedPoints.length} Issues Mapped</span>
        </div>
      </div>
    </div>
  );
}
