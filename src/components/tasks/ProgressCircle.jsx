import { motion } from 'framer-motion';

export default function ProgressCircle({ completed, total }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="7" />
        <motion.circle
          cx="48" cy="48" r={radius}
          fill="none" stroke="#004AFE" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold text-[#0F172A] leading-none">{completed}</span>
        <span className="text-[11px] text-[#94A3B8] leading-none mt-0.5">/ {total}</span>
      </div>
    </div>
  );
}