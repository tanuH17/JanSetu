// JanSetu Platform - Core Constants & Civic Configuration

export const ROLES = {
  CITIZEN: 'citizen',
  REPRESENTATIVE: 'representative',
  DEPARTMENT: 'department_official',
};

export const ROLE_CONFIG = {
  [ROLES.CITIZEN]: {
    name: 'Citizen',
    description: 'Report civic issues, track public complaints, and engage with community projects.',
    dashboardPath: '/citizen/dashboard',
    signInPath: '/citizen/sign-in',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: 'emerald',
  },
  [ROLES.REPRESENTATIVE]: {
    name: 'Elected Representative',
    description: 'Monitor constituency grievances, oversee department actions, and post official updates.',
    dashboardPath: '/representative/dashboard',
    signInPath: '/representative/sign-in',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    color: 'blue',
  },
  [ROLES.DEPARTMENT]: {
    name: 'Department Official',
    description: 'Resolve civic complaints, update task execution status, and maintain infrastructure projects.',
    dashboardPath: '/department/dashboard',
    signInPath: '/department/sign-in',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    color: 'indigo',
  },
};

export const COMPLAINT_STATUSES = {
  SUBMITTED: { label: 'Submitted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ASSIGNED: { label: 'Assigned', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const COMPLAINT_PRIORITIES = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-amber-100 text-amber-700' },
  URGENT: { label: 'Urgent', color: 'bg-rose-100 text-rose-700' },
};

// Initial Pilot States and Districts
export const JURISDICTIONS = [
  {
    state: 'Uttar Pradesh',
    districts: [
      { name: 'Lucknow', constituencies: ['Lucknow Central', 'Lucknow East', 'Lucknow West', 'Lucknow Cantonment', 'Sarojini Nagar'] },
      { name: 'Kanpur Nagar', constituencies: ['Kanpur Cantt', 'Kalyanpur', 'Govind Nagar', 'Arya Nagar'] },
      { name: 'Varanasi', constituencies: ['Varanasi North', 'Varanasi South', 'Varanasi Cantt', 'Rohaniya'] },
      { name: 'Prayagraj', constituencies: ['Prayagraj North', 'Prayagraj South', 'Prayagraj West'] },
    ],
  },
  {
    state: 'Delhi (NCT)',
    districts: [
      { name: 'New Delhi', constituencies: ['New Delhi', 'Delhi Cantt', 'R.K. Puram'] },
      { name: 'Central Delhi', constituencies: ['Chandni Chowk', 'Matia Mahal', 'Ballimaran'] },
      { name: 'South Delhi', constituencies: ['Kalkaji', 'Malviya Nagar', 'Greater Kailash'] },
    ],
  },
  {
    state: 'Karnataka',
    districts: [
      { name: 'Bengaluru Urban', constituencies: ['Shantinagar', 'Shivajinagar', 'BTM Layout', 'Malleshwaram'] },
      { name: 'Mysuru', constituencies: ['Krishnaraja', 'Chamaraja', 'Narasimharaja'] },
    ],
  },
];

export function dashboardPathForRole(role) {
  return ROLE_CONFIG[role]?.dashboardPath || ROLE_CONFIG[ROLES.CITIZEN].dashboardPath;
}

export const DEPARTMENTS = [
  { code: 'PWD', name: 'Public Works Department (PWD)' },
  { code: 'WATER', name: 'Jal Sansthan / Water Supply Board' },
  { code: 'MUNICIPAL', name: 'Municipal Corporation & Sanitation' },
  { code: 'POWER', name: 'Electricity Distribution Board' },
  { code: 'HEALTH', name: 'Public Health & Sanitation' },
  { code: 'EDUCATION', name: 'Education & School Infrastructure' },
];
