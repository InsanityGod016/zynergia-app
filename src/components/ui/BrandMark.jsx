import brandLogo from '../../../assets/icon-only.png';

export default function BrandMark({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src={brandLogo} alt="" aria-hidden="true" />;
}
