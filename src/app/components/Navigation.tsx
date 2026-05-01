import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import svgPaths from '../../imports/3MapView/svg-htifuw1sis';

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: svgPaths.pc80eb80, viewBox: '0 0 20 10', size: '19px' },
    { path: '/dashboard', icon: svgPaths.p20793584, viewBox: '0 0 18 18', size: '18px' },
    { path: '/map', icon: svgPaths.p3030ba00, viewBox: '0 0 18 18', size: '18px' },
    { path: '/controls', icon: svgPaths.p9eb1b40, viewBox: '0 0 20 20', size: '20px' },
    { path: '/logs', icon: svgPaths.p18c14180, viewBox: '0 0 20 16', size: '20px' },
  ];

  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(10,10,10,0.9)] bottom-0 content-stretch flex gap-[48.8px] h-[65px] items-center left-0 pl-[40.38px] pr-[40.43px] pt-px w-[390px] z-[50]">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-solid border-t inset-0 pointer-events-none" />
      {navItems.map((item, idx) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={idx} to={item.path} className="h-[64px]">
            <div className={`flex items-center justify-center h-full ${isActive ? 'drop-shadow-[0px_0px_4px_rgba(0,209,255,0.4)]' : ''}`}>
              <svg style={{ width: item.size, height: item.size }} fill="none" viewBox={item.viewBox}>
                <path d={item.icon} fill={isActive ? '#22D3EE' : '#52525B'} />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function TopHeader() {
  return (
    <div className="bg-[#0a0a0a] h-[64px] relative shrink-0 w-full z-[40]">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pb-px px-[16px] relative size-full">
          <div className="flex gap-[8px] items-center">
            <svg className="size-[18px]" fill="none" viewBox="0 0 18.0318 18.5059">
              <path d={svgPaths.p26ad4c00} fill="#22D3EE" />
            </svg>
            <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] text-[#22d3ee] text-[18px] tracking-[1.8px] uppercase leading-[28px]">
              <span>ROBOTIC CONTROL</span>
              <span>UNIT</span>
            </div>
          </div>
          <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] text-[#22d3ee] text-[14px] tracking-[-0.35px] uppercase leading-[20px]">
            <span>192.168.1.5:</span>
            <span>ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
