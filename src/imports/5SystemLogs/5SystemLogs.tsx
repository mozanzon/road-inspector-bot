import svgPaths from "./svg-t9yfwq2cbd";

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Heading 2">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3230] text-[24px] w-full">
        <p className="leading-[28.8px]">System Event Logs</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] w-full">
        <p className="leading-[21px]">Real-time telemetry and error reporting streams.</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Container1 />
    </div>
  );
}

function Container3() {
  return (
    <div className="flex-[1_0_0] min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip pb-px relative rounded-[inherit] size-full">
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[rgba(74,78,74,0.5)] tracking-[0.7px] w-full">
          <p className="leading-[normal]">Search events...</p>
        </div>
      </div>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-[#f5f1ea] relative rounded-[16px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start justify-center pl-[33px] pr-[13px] py-[9px] relative size-full">
          <Container3 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute bottom-[20.59%] content-stretch flex flex-col items-start left-[12px] top-[20.59%]" data-name="Container">
      <div className="relative shrink-0 size-[10.5px]" data-name="Icon">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.5 10.5">
          <path d={svgPaths.p210dd580} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function SearchInput() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Search Input">
      <Input />
      <Container4 />
    </div>
  );
}

function Button() {
  return (
    <div className="-translate-y-1/2 absolute bg-[rgba(120,168,134,0.1)] content-stretch flex flex-col items-center justify-center left-0 px-[13px] py-[9px] rounded-[9999px] top-[calc(50%-2px)]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#78a886] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#78a886] text-[11px] text-center tracking-[1.1px] w-[79.78px]">
        <p className="leading-[11px]">ALL EVENTS</p>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[4px] items-center left-[113.78px] px-[13px] py-[9px] rounded-[9999px] top-[calc(50%-2px)]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="bg-[#b83230] rounded-[9999px] shrink-0 size-[8px]" data-name="Background" />
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] text-center tracking-[1.1px] w-[63.81px]">
        <p className="leading-[11px]">CRITICAL</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[4px] items-center left-[223.59px] px-[13px] py-[9px] rounded-[9999px] top-[calc(50%-2px)]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="bg-[#705c30] rounded-[9999px] shrink-0 size-[8px]" data-name="Background" />
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] text-center tracking-[1.1px] w-[62.09px]">
        <p className="leading-[11px]">WARNING</p>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[4px] items-center left-[331.69px] px-[13px] py-[9px] rounded-[9999px] top-[calc(50%-2px)]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="bg-[#c8e8d0] rounded-[9999px] shrink-0 size-[8px]" data-name="Background" />
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] text-center tracking-[1.1px] w-[31.91px]">
        <p className="leading-[11px]">INFO</p>
      </div>
    </div>
  );
}

function FilterChips() {
  return (
    <div className="h-[33px] overflow-clip relative shrink-0 w-full" data-name="Filter Chips">
      <Button />
      <Button1 />
      <Button2 />
      <Button3 />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Container">
      <SearchInput />
      <FilterChips />
    </div>
  );
}

function SectionPageHeaderFilters() {
  return (
    <div className="absolute content-stretch flex flex-col items-start justify-between left-[16px] max-w-[1400px] right-[16px] top-[80px]" data-name="Section - Page Header & Filters">
      <Container />
      <Container2 />
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[12px] relative shrink-0 w-[15px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 12">
        <g id="Container">
          <path d={svgPaths.p1aebff60} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[117.78px]">
        <p className="leading-[11px]">CONSOLE OUTPUT</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Container6 />
        <Container7 />
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#78a886] text-[11px] tracking-[1.1px] w-[112.89px]">
        <p className="leading-[11px]">LIVE STREAMING</p>
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <div className="bg-[#78a886] rounded-[9999px] shadow-[0px_0px_8px_0px_rgba(0,209,255,0.6)] shrink-0 size-[8px]" data-name="Background+Shadow" />
        <Container9 />
      </div>
    </div>
  );
}

function TerminalHeader() {
  return (
    <div className="bg-[#f0ece4] relative shrink-0 w-full" data-name="Terminal Header">
      <div aria-hidden="true" className="absolute border-[#c4c8bc] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-[9px] pt-[8px] px-[16px] relative size-full">
          <Container5 />
          <Container8 />
        </div>
      </div>
    </div>
  );
}

function OverlayBorder() {
  return (
    <div className="bg-[rgba(255,218,216,0.2)] relative rounded-[8px] shrink-0 w-full" data-name="Overlay+Border">
      <div aria-hidden="true" className="absolute border border-[#b83230] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[5.25px] pt-[4px] px-[9px] relative size-full">
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[17px] justify-center leading-[0] not-italic relative shrink-0 text-[#b83230] text-[10px] text-center tracking-[1px] uppercase w-[58.02px]">
            <p className="leading-[16.25px]">CRITICAL</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="relative shrink-0 w-[96px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <OverlayBorder />
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="flex-[1_0_0] h-[204.75px] min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] left-0 not-italic text-[#b83230] text-[14px] top-[101.5px] tracking-[0.7px] w-[69.8px]">
          <p className="leading-[22.75px] mb-0">Collision</p>
          <p className="leading-[22.75px] mb-0">avoidance</p>
          <p className="leading-[22.75px] mb-0">triggered.</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px] mb-0">Emergency</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px] mb-0">braking</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px] mb-0">applied.</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px] mb-0">Object</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px] mb-0">detected at</p>
          <p className="font-['Liberation_Serif:Regular',sans-serif] leading-[22.75px]">0.4m.</p>
        </div>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[2.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p32c32280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="relative shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center relative size-full">
        <Container12 />
      </div>
    </div>
  );
}

function EventItemCritical() {
  return (
    <div className="content-stretch flex gap-[16px] items-start pb-[13px] pt-[12px] relative shrink-0 w-full" data-name="Event Item: CRITICAL">
      <div aria-hidden="true" className="absolute border-[rgba(234,230,222,0.5)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[23px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-[82.69px]">
        <p className="leading-[22.75px]">10:45:12.304</p>
      </div>
      <Container10 />
      <Container11 />
      <Button4 />
    </div>
  );
}

function Border() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Border">
      <div aria-hidden="true" className="absolute border border-[#705c30] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[5.25px] pt-[4px] px-[9px] relative size-full">
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[17px] justify-center leading-[0] not-italic relative shrink-0 text-[#705c30] text-[10px] text-center tracking-[1px] uppercase w-[56.45px]">
            <p className="leading-[16.25px]">WARNING</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[98.17px] top-[12px] w-[96px]" data-name="Container">
      <Border />
    </div>
  );
}

function Container14() {
  return (
    <div className="absolute h-[136.5px] left-[210.17px] right-[22.63px] top-[12px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[137px] justify-center leading-[0] left-0 not-italic text-[#705c30] text-[14px] top-[67.38px] tracking-[0.7px] w-[91.21px]">
        <p className="leading-[22.75px] mb-0">Low battery</p>
        <p className="leading-[22.75px] mb-0">threshold</p>
        <p className="leading-[22.75px] mb-0">reached</p>
        <p className="leading-[22.75px] mb-0">(15%). Return</p>
        <p className="leading-[22.75px] mb-0">to dock</p>
        <p className="leading-[22.75px]">recommended.</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[2.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p32c32280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="absolute content-stretch flex flex-col items-center justify-center left-[317.38px] top-[12px]" data-name="Button">
      <Container15 />
    </div>
  );
}

function EventItemWarning() {
  return (
    <div className="h-[161.5px] relative shrink-0 w-full" data-name="Event Item: WARNING">
      <div aria-hidden="true" className="absolute border-[rgba(234,230,222,0.5)] border-b border-solid inset-0 pointer-events-none" />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[23px] justify-center leading-[0] left-0 not-italic text-[#4a4e4a] text-[14px] top-[23.38px] tracking-[0.7px] w-[82.17px]">
        <p className="leading-[22.75px]">10:44:05.112</p>
      </div>
      <Container13 />
      <Container14 />
      <Button5 />
    </div>
  );
}

function Border1() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Border">
      <div aria-hidden="true" className="absolute border border-[#c8e8d0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[5.25px] pt-[4px] px-[9px] relative size-full">
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[17px] justify-center leading-[0] not-italic relative shrink-0 text-[#c8e8d0] text-[10px] text-center tracking-[1px] uppercase w-[29px]">
            <p className="leading-[16.25px]">INFO</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0 w-[96px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Border1 />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="flex-[1_0_0] h-[136.5px] min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] left-0 not-italic text-[#2e3230] text-[14px] top-[67.38px] tracking-[0.7px] w-[80.13px]">
          <p className="leading-[22.75px] mb-0">System</p>
          <p className="leading-[22.75px] mb-0">initialized</p>
          <p className="leading-[22.75px] mb-0">successfully.</p>
          <p className="leading-[22.75px] mb-0">All sensor</p>
          <p className="leading-[22.75px] mb-0">arrays</p>
          <p className="leading-[22.75px]">online.</p>
        </div>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[2.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p32c32280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button6() {
  return (
    <div className="relative shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center relative size-full">
        <Container18 />
      </div>
    </div>
  );
}

function EventItemInfo() {
  return (
    <div className="content-stretch flex gap-[16px] items-start pb-[13px] pt-[12px] relative shrink-0 w-full" data-name="Event Item: INFO">
      <div aria-hidden="true" className="absolute border-[rgba(234,230,222,0.5)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[23px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-[82.69px]">
        <p className="leading-[22.75px]">10:43:00.000</p>
      </div>
      <Container16 />
      <Container17 />
      <Button6 />
    </div>
  );
}

function Border2() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Border">
      <div aria-hidden="true" className="absolute border border-[#c8e8d0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[5.25px] pt-[4px] px-[9px] relative size-full">
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[17px] justify-center leading-[0] not-italic relative shrink-0 text-[#c8e8d0] text-[10px] text-center tracking-[1px] uppercase w-[29px]">
            <p className="leading-[16.25px]">INFO</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[98.69px] top-[12px] w-[96px]" data-name="Container">
      <Border2 />
    </div>
  );
}

function Container20() {
  return (
    <div className="absolute h-[113.75px] left-[210.69px] right-[19.51px] top-[12px]" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[114px] justify-center leading-[0] left-0 not-italic text-[#2e3230] text-[14px] top-[56px] tracking-[0.7px] w-[93.81px]">
        <p className="leading-[22.75px] mb-0">Connection</p>
        <p className="leading-[22.75px] mb-0">established</p>
        <p className="leading-[22.75px] mb-0">with central</p>
        <p className="leading-[22.75px] mb-0">server IP:</p>
        <p className="leading-[22.75px]">192.168.1.100.</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[2.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p32c32280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button7() {
  return (
    <div className="absolute content-stretch flex flex-col items-center justify-center left-[320.48px] top-[12px]" data-name="Button">
      <Container21 />
    </div>
  );
}

function EventItemInfo1() {
  return (
    <div className="h-[138.75px] relative shrink-0 w-full" data-name="Event Item: INFO">
      <div aria-hidden="true" className="absolute border-[rgba(234,230,222,0.5)] border-b border-solid inset-0 pointer-events-none" />
      <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[23px] justify-center leading-[0] left-0 not-italic text-[#4a4e4a] text-[14px] top-[23.38px] tracking-[0.7px] w-[82.69px]">
        <p className="leading-[22.75px]">10:42:55.891</p>
      </div>
      <Container19 />
      <Container20 />
      <Button7 />
    </div>
  );
}

function Border3() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Border">
      <div aria-hidden="true" className="absolute border border-[#c8e8d0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center pb-[5.25px] pt-[4px] px-[9px] relative size-full">
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[17px] justify-center leading-[0] not-italic relative shrink-0 text-[#c8e8d0] text-[10px] text-center tracking-[1px] uppercase w-[29px]">
            <p className="leading-[16.25px]">INFO</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[96px]" data-name="Container">
      <Border3 />
    </div>
  );
}

function Container23() {
  return (
    <div className="flex-[1_0_0] h-[136.5px] min-w-px relative" data-name="Container">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] left-0 not-italic text-[#2e3230] text-[14px] top-[67.38px] tracking-[0.7px] w-[67.66px]">
        <p className="leading-[22.75px] mb-0">Boot</p>
        <p className="leading-[22.75px] mb-0">sequence</p>
        <p className="leading-[22.75px] mb-0">initiated.</p>
        <p className="leading-[22.75px] mb-0">Diagnostic</p>
        <p className="leading-[22.75px] mb-0">check</p>
        <p className="leading-[22.75px]">passed.</p>
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[9.333px] relative shrink-0 w-[2.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p32c32280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button8() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Button">
      <Container24 />
    </div>
  );
}

function EventItemInfo2() {
  return (
    <div className="content-stretch flex gap-[16px] items-start py-[12px] relative shrink-0 w-full" data-name="Event Item: INFO">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[23px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-[82.69px]">
        <p className="leading-[22.75px]">10:42:50.102</p>
      </div>
      <Container22 />
      <Container23 />
      <Button8 />
    </div>
  );
}

function ScrollableLogList() {
  return (
    <div className="relative shrink-0 w-full" data-name="Scrollable Log List">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start p-[16px] relative size-full">
          <EventItemCritical />
          <EventItemWarning />
          <EventItemInfo />
          <EventItemInfo1 />
          <EventItemInfo2 />
        </div>
      </div>
    </div>
  );
}

function TerminalEventListMainCanvas() {
  return (
    <div className="bg-white col-1 justify-self-stretch relative rounded-[16px] row-1 self-start shrink-0" data-name="Terminal Event List (Main Canvas)">
      <div className="content-stretch flex flex-col items-start overflow-clip p-px relative rounded-[inherit] size-full">
        <TerminalHeader />
        <ScrollableLogList />
      </div>
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

function Heading1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-full">
          <p className="leading-[11px]">DIAGNOSTIC SUMMARY</p>
        </div>
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-full">
          <p className="leading-[14px]">UPTIME</p>
        </div>
      </div>
    </div>
  );
}

function Paragraph() {
  return <div className="h-[52.8px] shrink-0 w-full" data-name="Paragraph" />;
}

function BackgroundBorder() {
  return (
    <div className="bg-[#f5f1ea] col-1 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex flex-col gap-[4px] items-start p-[13px] relative size-full">
        <Container26 />
        <Paragraph />
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-full">
          <p className="leading-[14px]">ERRORS</p>
        </div>
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.8px] relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#b83230] text-[48px] tracking-[-0.96px] w-full">
          <p className="leading-[52.8px]">01</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder1() {
  return (
    <div className="bg-[#f5f1ea] col-2 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex flex-col gap-[3px] items-start p-[13px] relative size-full">
        <Container27 />
        <Container28 />
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[8px] gap-y-[8px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[_96.80px] relative size-full">
        <BackgroundBorder />
        <BackgroundBorder1 />
      </div>
    </div>
  );
}

function Background() {
  return <div className="bg-[#eae6de] h-[4px] rounded-[9999px] shrink-0 w-full" data-name="Background" />;
}

function Margin() {
  return (
    <div className="h-[12px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] relative size-full">
        <Background />
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[14px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-[111.81px]">
        <p className="leading-[14px]">MEMORY LOAD</p>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[14px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] tracking-[0.7px] w-[27.77px]">
        <p className="leading-[14px]">85%</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="h-[14px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <Container30 />
        <Container31 />
      </div>
    </div>
  );
}

function QuickStatsCard() {
  return (
    <div className="bg-[#faf6f0] relative rounded-[16px] shrink-0 w-full" data-name="Quick Stats Card">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[17px] relative size-full">
        <Heading1 />
        <Container25 />
        <Margin />
        <Container29 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-full">
          <p className="leading-[11px]">LOG OPERATIONS</p>
        </div>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0 size-[9.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 9.33333">
        <g id="Container">
          <path d={svgPaths.p21f4d300} fill="var(--fill-0, #78A886)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button9() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#78a886] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7.99px] items-center justify-center px-px py-[13px] relative size-full">
        <Container32 />
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#78a886] text-[11px] text-center tracking-[1.1px] w-[90.67px]">
          <p className="leading-[11px]">EXPORT LOGS</p>
        </div>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="h-[10.5px] relative shrink-0 w-[9.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.33333 10.5">
        <g id="Container">
          <path d={svgPaths.p1224c680} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button10() {
  return (
    <div className="relative rounded-[8px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center px-px py-[13px] relative size-full">
        <Container33 />
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] text-center tracking-[1.1px] w-[98.47px]">
          <p className="leading-[11px]">CLEAR BUFFER</p>
        </div>
      </div>
    </div>
  );
}

function ActionsCard() {
  return (
    <div className="bg-[#faf6f0] relative rounded-[16px] shrink-0 w-full" data-name="Actions Card">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[17px] relative size-full">
        <Heading2 />
        <Button9 />
        <Button10 />
      </div>
    </div>
  );
}

function SidePanelMetricsDiagnostics() {
  return (
    <div className="col-1 content-stretch flex flex-col gap-[11.99px] items-start justify-self-stretch relative row-2 self-start shrink-0" data-name="Side Panel (Metrics/Diagnostics)">
      <QuickStatsCard />
      <ActionsCard />
    </div>
  );
}

function MainLayoutGrid() {
  return (
    <div className="absolute gap-x-[12px] gap-y-[12px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[__921px_376.80px] left-[16px] right-[16px] top-[256.8px]" data-name="Main Layout Grid">
      <TerminalEventListMainCanvas />
      <SidePanelMetricsDiagnostics />
    </div>
  );
}

function ScrollableCanvas() {
  return (
    <div className="bg-[#faf6f0] flex-[1_0_0] min-h-px relative w-full" data-name="Scrollable Canvas">
      <SectionPageHeaderFilters />
      <MainLayoutGrid />
    </div>
  );
}

function Container35() {
  return (
    <div className="h-[18.506px] relative shrink-0 w-[18.032px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.0318 18.5059">
        <g id="Container">
          <path d={svgPaths.p26ad4c00} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[39.31px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[56px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[18px] tracking-[1.8px] uppercase w-[157.11px]">
        <p className="leading-[28px] mb-0">ROBOTIC</p>
        <p className="leading-[28px]">CONTROL UNIT</p>
      </div>
    </div>
  );
}

function Container34() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Container35 />
        <Container36 />
      </div>
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex flex-col items-center pl-[13.56px] pr-[13.58px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[14px] text-center tracking-[-0.35px] uppercase w-[74.42px]">
        <p className="leading-[20px] mb-0">192.168.1.5:</p>
        <p className="leading-[20px]">ONLINE</p>
      </div>
    </div>
  );
}

function Button11() {
  return (
    <div className="opacity-80 relative rounded-[8px] shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center px-[12px] py-[8px] relative size-full">
        <Container37 />
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-[#0a0a0a] content-stretch flex h-[64px] items-center justify-between left-0 pb-px px-[16px] right-0 top-0" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-b border-solid inset-0 pointer-events-none" />
      <Container34 />
      <Button11 />
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[884px] items-start justify-center min-w-px overflow-clip relative" data-name="Main Content Canvas">
      <ScrollableCanvas />
      <HeaderTopAppBar />
    </div>
  );
}

function Container38() {
  return (
    <div className="h-[10px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 10">
        <g id="Container">
          <path d={svgPaths.pc80eb80} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button12() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Button">
      <Container38 />
    </div>
  );
}

function ButtonCssTransform() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Button:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex h-[9.5px] items-center justify-center relative shrink-0 w-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Button12 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container39() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p20793584} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button13() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Button">
      <Container39 />
    </div>
  );
}

function ButtonCssTransform1() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Button:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[17.1px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Button13 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container40() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p1f25e00} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button14() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Button">
      <Container40 />
    </div>
  );
}

function ButtonCssTransform2() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Button:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[17.1px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Button14 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container41() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p9eb1b40} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button15() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Button">
      <Container41 />
    </div>
  );
}

function ButtonCssTransform3() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Button:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Button15 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container42() {
  return (
    <div className="h-[16px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
        <g id="Container">
          <path d={svgPaths.p18c14180} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button16() {
  return (
    <div className="content-stretch drop-shadow-[0px_0px_4px_rgba(0,209,255,0.4)] flex flex-col items-center justify-center relative" data-name="Button">
      <Container42 />
    </div>
  );
}

function ButtonCssTransform4() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Button:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex h-[15.2px] items-center justify-center relative shrink-0 w-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Button16 />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNavigationBar() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(10,10,10,0.9)] bottom-0 content-stretch flex gap-[48.8px] h-[65px] items-center left-0 pl-[40.38px] pr-[40.43px] pt-px w-[390px]" data-name="Mobile Bottom Navigation Bar">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-solid border-t inset-0 pointer-events-none" />
      <ButtonCssTransform />
      <ButtonCssTransform1 />
      <ButtonCssTransform2 />
      <ButtonCssTransform3 />
      <ButtonCssTransform4 />
    </div>
  );
}

export default function Component5SystemLogs() {
  return (
    <div className="content-stretch flex items-start justify-center relative size-full" style={{ backgroundImage: "linear-gradient(90deg, rgb(250, 246, 240) 0%, rgb(250, 246, 240) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }} data-name="5. System Logs">
      <MainContentCanvas />
      <MobileBottomNavigationBar />
    </div>
  );
}