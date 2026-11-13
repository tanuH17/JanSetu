import React, { useState } from 'react';
import { X, Search, ExternalLink, BookOpen } from 'lucide-react';

const GOVERNMENT_SCHEMES = [
  {
    id: 1,
    title: 'Pradhan Mantri Awas Yojana (PMAY-U / G)',
    ministry: 'Ministry of Housing and Urban Affairs',
    category: 'Housing',
    description: 'Provides affordable pucca houses with basic amenities (water, sanitation, electricity) to eligible urban and rural households.',
    beneficiaries: 'Economically Weaker Section (EWS) / Lower Income Group (LIG)',
    website: 'https://pmaymis.gov.in',
  },
  {
    id: 2,
    title: 'Jal Jeevan Mission (Har Ghar Jal)',
    ministry: 'Ministry of Jal Shakti',
    category: 'Water & Sanitation',
    description: 'Aims to provide functional household tap connections (FHTC) delivering potable water to every rural household by 2024–2026.',
    beneficiaries: 'Rural households, Anganwadi centers, and public schools',
    website: 'https://jaljeevanmission.gov.in',
  },
  {
    id: 3,
    title: 'Ayushman Bharat – PM-JAY',
    ministry: 'National Health Authority (NHA)',
    category: 'Health',
    description: 'Health assurance scheme offering cashless hospital coverage up to ₹5 Lakhs per family per year for secondary and tertiary healthcare.',
    beneficiaries: 'Bottom 40% vulnerable population per SECC 2011 database',
    website: 'https://pmjay.gov.in',
  },
  {
    id: 4,
    title: 'PM Surya Ghar: Muft Bijli Yojana',
    ministry: 'Ministry of New and Renewable Energy',
    category: 'Clean Energy',
    description: 'Financial assistance and direct subsidy to install rooftop solar units, providing up to 300 units of free electricity every month.',
    beneficiaries: 'Residential electricity consumers across all states',
    website: 'https://pmsuryaghar.gov.in',
  },
  {
    id: 5,
    title: 'PM Street Vendor AtmaNirbhar Nidhi (PM SVANidhi)',
    ministry: 'Ministry of Housing and Urban Affairs',
    category: 'Livelihood',
    description: 'Special micro-credit facility providing collateral-free working capital loans of ₹10,000, ₹20,000, and ₹50,000 to urban street vendors.',
    beneficiaries: 'Urban vendors and hawkers operating prior to March 2020',
    website: 'https://pmsvanidhi.mohua.gov.in',
  },
  {
    id: 6,
    title: 'National Career Service & Skill India Mission',
    ministry: 'Ministry of Skill Development & Entrepreneurship',
    category: 'Employment',
    description: 'Connecting jobseekers with industry opportunities, certified vocational training, and apprenticeship apprenticeships across India.',
    beneficiaries: 'Youth and job seekers looking for skill certification',
    website: 'https://www.ncs.gov.in',
  },
];

export default function SchemesModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', 'Housing', 'Water & Sanitation', 'Health', 'Clean Energy', 'Livelihood', 'Employment'];

  const filteredSchemes = GOVERNMENT_SCHEMES.filter((scheme) => {
    const matchesSearch =
      scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || scheme.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schemes-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 id="schemes-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                Government Welfare Schemes &amp; Public Information
              </h3>
              <p className="text-xs text-slate-500">
                Official civic initiatives and welfare programs applicable to your district.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search schemes by name or keyword…"
              className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of schemes */}
        <div className="mt-4 max-h-[55vh] overflow-y-auto space-y-3 pr-1">
          {filteredSchemes.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No schemes match your search criteria.</p>
          ) : (
            filteredSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{scheme.title}</h4>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {scheme.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{scheme.description}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  <span>Beneficiaries: <strong className="text-slate-700">{scheme.beneficiaries}</strong></span>
                  <a
                    href={scheme.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
