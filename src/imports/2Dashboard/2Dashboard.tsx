import svgPaths from "./svg-ibppw96mzg";

function Heading() {
  return (
    <div className="h-[28.8px] relative shrink-0 w-[273.98px]" data-name="Heading 1">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[29px] justify-center leading-[0] left-0 not-italic text-[#2e3230] text-[24px] top-[13.5px] tracking-[-0.6px] w-[273.98px]">
        <p className="leading-[28.8px]">ROBOT-01: CONNECTED</p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Container">
      <div className="bg-[#f0e8db] rounded-[9999px] shadow-[0px_0px_12px_0px_rgba(54,255,139,0.8)] shrink-0 size-[12px]" data-name="Background+Shadow" />
      <Heading />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase w-full">
        <p className="leading-[11px] mb-0">TELEMETRY ACTIVE. LOW LATENCY LINK</p>
        <p className="leading-[11px]">ESTABLISHED.</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Container1 />
        <Container2 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[43.77px]">
        <p className="leading-[11px]">UPLINK</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[14px] justify-center leading-[0] relative shrink-0 text-[#4a7c59] text-[14px] tracking-[0.7px] w-[58.69px]">
        <p className="leading-[14px]">45.2 MS</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-col items-end relative self-stretch shrink-0" data-name="Container">
      <Container5 />
      <Container6 />
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[80.53px]">
        <p className="leading-[11px]">PACKET LOSS</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[14px] justify-center leading-[0] relative shrink-0 text-[#f0e8db] text-[14px] tracking-[0.7px] w-[44.78px]">
        <p className="leading-[14px]">0.00%</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-end relative self-stretch shrink-0" data-name="Container">
      <Container8 />
      <Container9 />
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-start relative size-full">
        <Container4 />
        <div className="bg-[#eae6de] h-[32px] shrink-0 w-px" data-name="Vertical Divider" />
        <Container7 />
      </div>
    </div>
  );
}

function SectionGlobalStatusModule() {
  return (
    <div className="bg-[#f0ece4] relative rounded-[16px] shrink-0 w-full" data-name="Section - Global Status Module">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-between p-[25px] relative size-full">
          <div className="absolute bg-gradient-to-r from-[rgba(120,168,134,0.1)] inset-px to-[rgba(120,168,134,0)]" data-name="Decorative Glow" />
          <Container />
          <Container3 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(120,168,134,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[13.333px] relative shrink-0 w-[8.667px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.66667 13.3333">
        <g id="Container">
          <path d={svgPaths.pc13ca80} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container11 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[94.06px]">
        <p className="leading-[11px]">BATTERY LEVEL</p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Header">
      <Container10 />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[14px] justify-center leading-[0] relative shrink-0 text-[#4a7c59] text-[14px] tracking-[0.7px] w-[96.39px]">
        <p className="leading-[14px]">DISCHARGING</p>
      </div>
    </div>
  );
}

function HeaderMargin() {
  return (
    <div className="mb-[-0.003px] relative shrink-0 w-full" data-name="Header:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[24px] relative size-full">
        <Header />
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex gap-[4px] items-baseline leading-[0] relative shrink-0 w-full" data-name="Paragraph">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[53px] justify-center relative shrink-0 text-[#2e3230] text-[48px] tracking-[-0.96px] w-[55.69px]">
        <p className="leading-[52.8px]">85</p>
      </div>
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center not-italic relative shrink-0 text-[#4a4e4a] text-[18px] w-[18.09px]">
        <p className="leading-[23.4px]">%</p>
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="bg-[#e4e0d8] content-stretch flex h-[6px] items-start overflow-clip relative rounded-[9999px] shrink-0 w-full" data-name="Background">
      <div className="bg-[#4a7c59] h-full shadow-[0px_0px_10px_0px_rgba(164,230,255,0.4)] shrink-0 w-[275.39px]" data-name="Background+Shadow" />
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex flex-col gap-[7.9px] items-start relative shrink-0 w-full" data-name="Container">
      <Paragraph />
      <Background />
    </div>
  );
}

function Margin() {
  return (
    <div className="h-[106.003px] mb-[-0.003px] min-h-[66.80000305175781px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-end min-h-[inherit] pt-[39.203px] relative size-full">
        <Container12 />
      </div>
    </div>
  );
}

function ArticleBatteryCard() {
  return (
    <div className="bg-[#f0ece4] col-1 justify-self-stretch min-h-[180px] relative rounded-[16px] row-1 self-start shrink-0" data-name="Article - Battery Card">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between min-h-[inherit] pb-[17.003px] pt-[17px] px-[17px] relative size-full">
        <HeaderMargin />
        <Margin />
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[10.667px] relative shrink-0 w-[13.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 10.6667">
        <g id="Container">
          <path d={svgPaths.p191c53c0} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container14 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[97.73px]">
        <p className="leading-[11px]">SYSTEM HEALTH</p>
      </div>
    </div>
  );
}

function Header1() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Header">
      <Container13 />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[14px] justify-center leading-[0] relative shrink-0 text-[#f0e8db] text-[14px] tracking-[0.7px] w-[63.23px]">
        <p className="leading-[14px]">OPTIMAL</p>
      </div>
    </div>
  );
}

function HeaderMargin1() {
  return (
    <div className="mb-[-0.003px] relative shrink-0 w-full" data-name="Header:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[24px] relative size-full">
        <Header1 />
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex gap-[4px] items-baseline leading-[0] relative shrink-0" data-name="Paragraph">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[53px] justify-center relative shrink-0 text-[#2e3230] text-[48px] tracking-[-0.96px] w-[56.55px]">
        <p className="leading-[52.8px]">98</p>
      </div>
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center not-italic relative shrink-0 text-[#4a4e4a] text-[18px] w-[18.09px]">
        <p className="leading-[23.4px]">%</p>
      </div>
    </div>
  );
}

function SparklineVisual() {
  return (
    <div className="content-stretch flex gap-[3px] h-[40px] items-end justify-center relative shrink-0 w-[96px]" data-name="Sparkline visual">
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[24px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[26px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[22px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[28px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[32px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#e4e0d8] flex-[1_0_0] h-[36px] min-w-px rounded-tl-[2px] rounded-tr-[2px]" data-name="Background" />
      <div className="bg-[#f0e8db] flex-[1_0_0] h-[39.19px] min-w-px rounded-tl-[2px] rounded-tr-[2px] shadow-[0px_0px_8px_0px_rgba(54,255,139,0.4)]" data-name="Background+Shadow" />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex items-end justify-between relative shrink-0 w-full" data-name="Container">
      <Paragraph1 />
      <SparklineVisual />
    </div>
  );
}

function Margin1() {
  return (
    <div className="h-[106.003px] mb-[-0.003px] min-h-[52.79999923706055px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-end min-h-[inherit] pt-[53.203px] relative size-full">
        <Container15 />
      </div>
    </div>
  );
}

function ArticleSystemHealthCard() {
  return (
    <div className="bg-[#f0ece4] col-1 justify-self-stretch min-h-[180px] relative rounded-[16px] row-2 self-start shrink-0" data-name="Article - System Health Card">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between min-h-[inherit] pb-[17.003px] pt-[17px] px-[17px] relative size-full">
        <HeaderMargin1 />
        <Margin1 />
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p264eb400} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container16() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container17 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[66.59px]">
        <p className="leading-[11px]">PROXIMITY</p>
      </div>
    </div>
  );
}

function Header2() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Header">
      <Container16 />
      <div className="bg-[#b83230] rounded-[9999px] shadow-[0px_0px_10px_0px_rgba(255,180,171,0.8)] shrink-0 size-[8px]" data-name="Background+Shadow" />
    </div>
  );
}

function HeaderMargin2() {
  return (
    <div className="mb-[-0.003px] relative shrink-0 w-full" data-name="Header:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[24px] relative size-full">
        <Header2 />
      </div>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="content-stretch flex gap-[4px] items-baseline leading-[0] relative shrink-0 w-full" data-name="Paragraph">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[53px] justify-center relative shrink-0 text-[#b83230] text-[48px] tracking-[-0.96px] w-[61.64px]">
        <p className="leading-[52.8px]">1.2</p>
      </div>
      <div className="flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold h-[24px] justify-center not-italic relative shrink-0 text-[#ffdad8] text-[18px] w-[16.61px]">
        <p className="leading-[23.4px]">M</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[12px] text-[rgba(184,50,48,0.8)] tracking-[1.2px] uppercase w-full">
        <p className="leading-[16px]">WARNING: OBSTACLE NEAR</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col gap-[3.9px] items-start relative shrink-0 w-full" data-name="Container">
      <Paragraph2 />
      <Container19 />
    </div>
  );
}

function Margin2() {
  return (
    <div className="h-[106.003px] mb-[-0.003px] min-h-[72.80000305175781px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-end min-h-[inherit] pt-[33.203px] relative size-full">
        <Container18 />
      </div>
    </div>
  );
}

function ArticleDistanceCard() {
  return (
    <div className="bg-[#f0ece4] col-1 justify-self-stretch min-h-[180px] relative rounded-[16px] row-3 self-start shrink-0" data-name="Article - Distance Card">
      <div className="min-h-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-between min-h-[inherit] pb-[17.003px] pt-[17px] px-[17px] relative size-full">
          <div className="absolute bg-gradient-to-b from-[rgba(184,50,48,0)] inset-px to-[rgba(184,50,48,0.05)]" data-name="Gradient" />
          <HeaderMargin2 />
          <Margin2 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(184,50,48,0.4)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0 size-[13.333px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.3333 13.3333">
        <g id="Container">
          <path d={svgPaths.p7325f00} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Container21 />
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold h-[11px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-[128.09px]">
        <p className="leading-[11px]">IMU SENSOR STREAM</p>
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#faf6f0] content-stretch flex flex-col items-start px-[9px] py-[3px] relative rounded-[8px] shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col font-['Space_Grotesk:Medium',sans-serif] font-medium h-[16px] justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[12px] tracking-[0.6px] w-[26.13px]">
        <p className="leading-[16px]">LIVE</p>
      </div>
    </div>
  );
}

function Header3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <Container20 />
        <BackgroundBorder />
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-full">
        <p className="leading-[11px]">PITCH</p>
      </div>
    </div>
  );
}

function Margin3() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[4px] relative size-full">
        <Container23 />
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.8px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a7c59] text-[24px] w-full">
          <p className="leading-[28.8px]">+12.4°</p>
        </div>
      </div>
    </div>
  );
}

function Pitch() {
  return (
    <div className="bg-[#faf6f0] col-1 justify-self-stretch relative rounded-[8px] row-1 self-start shrink-0" data-name="Pitch">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pb-[14px] pt-[13px] px-[13px] relative size-full">
          <Margin3 />
          <Container24 />
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-full">
        <p className="leading-[11px]">ROLL</p>
      </div>
    </div>
  );
}

function Margin4() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[4px] relative size-full">
        <Container25 />
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.8px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a7c59] text-[24px] w-full">
          <p className="leading-[28.8px]">-2.1°</p>
        </div>
      </div>
    </div>
  );
}

function Roll() {
  return (
    <div className="bg-[#faf6f0] col-1 justify-self-stretch relative rounded-[8px] row-2 self-start shrink-0" data-name="Roll">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pb-[14px] pt-[13px] px-[13px] relative size-full">
          <Margin4 />
          <Container26 />
        </div>
      </div>
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] w-full">
        <p className="leading-[11px]">YAW</p>
      </div>
    </div>
  );
}

function Margin5() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[4px] relative size-full">
        <Container27 />
      </div>
    </div>
  );
}

function Container28() {
  return (
    <div className="mb-[-1px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-[0.8px] relative size-full">
        <div className="flex flex-col font-['Space_Grotesk:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[#4a7c59] text-[24px] w-full">
          <p className="leading-[28.8px]">184.7°</p>
        </div>
      </div>
    </div>
  );
}

function Yaw() {
  return (
    <div className="bg-[#faf6f0] col-1 justify-self-stretch relative rounded-[8px] row-3 self-start shrink-0" data-name="Yaw">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pb-[14px] pt-[13px] px-[13px] relative size-full">
          <Margin5 />
          <Container28 />
        </div>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[12px] gap-y-[12px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[___69.80px_69.80px_69.80px] relative size-full">
        <Pitch />
        <Roll />
        <Yaw />
      </div>
    </div>
  );
}

function ArticleImuSensorData() {
  return (
    <div className="bg-[#f0ece4] col-1 justify-self-stretch relative rounded-[16px] row-4 self-start shrink-0" data-name="Article - IMU Sensor Data">
      <div aria-hidden="true" className="absolute border border-[#eae6de] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[17px] relative size-full">
        <Header3 />
        <Container22 />
      </div>
    </div>
  );
}

function BentoGrid() {
  return (
    <div className="gap-x-[16px] gap-y-[16px] grid grid-cols-[repeat(1,minmax(0,1fr))] grid-rows-[_____180px_180px_180px_313.39px_200px] relative shrink-0 w-full" data-name="Bento Grid">
      <ArticleBatteryCard />
      <ArticleSystemHealthCard />
      <ArticleDistanceCard />
      <ArticleImuSensorData />
    </div>
  );
}

function MainScrollableDashboardContent() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] inset-[64px_0_-482.19px_0] items-start pb-[96px] pt-[16px] px-[16px]" data-name="Main - Scrollable Dashboard Content">
      <SectionGlobalStatusModule />
      <BentoGrid />
    </div>
  );
}

function Container30() {
  return (
    <div className="h-[18.506px] relative shrink-0 w-[18.032px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.0318 18.5059">
        <g id="Container">
          <path d={svgPaths.p1154e780} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[10.43px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[56px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[18px] tracking-[1.8px] uppercase w-[202.7px]">
        <p className="leading-[28px] mb-0">ROBOTIC CONTROL</p>
        <p className="leading-[28px]">UNIT</p>
      </div>
    </div>
  );
}

function Container29() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Container30 />
        <Container31 />
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[34.44px] relative size-full">
        <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[40px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[14px] tracking-[-0.35px] uppercase w-[74.42px]">
          <p className="leading-[20px] mb-0">192.168.1.5:</p>
          <p className="leading-[20px]">ONLINE</p>
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-[#0a0a0a] content-stretch flex h-[64px] items-center justify-between left-0 pb-px px-[16px] right-0 top-0" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-b border-solid inset-0 pointer-events-none" />
      <Container29 />
      <Container32 />
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px overflow-clip relative" data-name="Main Content Canvas">
      <MainScrollableDashboardContent />
      <HeaderTopAppBar />
    </div>
  );
}

function Margin6() {
  return (
    <div className="h-[14px] mb-[-0.221px] relative shrink-0 w-[20px]" data-name="Margin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 14">
        <g id="Margin">
          <path d={svgPaths.pc80eb80} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container33() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[61.305px]">
        <p className="leading-[15px]">CONNECTION</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Margin6 />
      <Container33 />
    </div>
  );
}

function LinkCssTransform() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[27.34px] items-center justify-center relative shrink-0 w-[58.24px]" style={{ "--transform-inner-width": "300", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link />
          </div>
        </div>
      </div>
    </div>
  );
}

function Margin7() {
  return (
    <div className="h-[22px] mb-[-0.221px] relative shrink-0 w-[18px]" data-name="Margin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 22">
        <g id="Margin">
          <path d={svgPaths.p191dcc80} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[10px] tracking-[-0.5px] uppercase w-[57.716px]">
        <p className="leading-[15px]">DASHBOARD</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch drop-shadow-[0px_0px_4px_rgba(0,209,255,0.4)] flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Margin7 />
      <Container34 />
    </div>
  );
}

function LinkCssTransform1() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pl-[1.14px] pt-[12.08px] relative size-full">
        <div className="flex h-[34.94px] items-center justify-center relative shrink-0 w-[54.83px]" style={{ "--transform-inner-width": "300", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link1 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Margin8() {
  return (
    <div className="h-[22px] mb-[-0.221px] relative shrink-0 w-[18px]" data-name="Margin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 22">
        <g id="Margin">
          <path d={svgPaths.p3030ba00} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container35() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[20.095px]">
        <p className="leading-[15px]">MAP</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Margin8 />
      <Container35 />
    </div>
  );
}

function LinkCssTransform2() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[34.94px] items-center justify-center relative shrink-0 w-[19.09px]" style={{ "--transform-inner-width": "300", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link2 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Margin9() {
  return (
    <div className="h-[24px] mb-[-0.221px] relative shrink-0 w-[20px]" data-name="Margin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 24">
        <g id="Margin">
          <path d={svgPaths.p7ff1bb4} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[50.874px]">
        <p className="leading-[15px]">CONTROLS</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Margin9 />
      <Container36 />
    </div>
  );
}

function LinkCssTransform3() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[36.84px] items-center justify-center relative shrink-0 w-[48.33px]" style={{ "--transform-inner-width": "300", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link3 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Margin10() {
  return (
    <div className="mb-[-0.221px] relative shrink-0 size-[20px]" data-name="Margin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Margin">
          <path d={svgPaths.p18c14180} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[25.253px]">
        <p className="leading-[15px]">LOGS</p>
      </div>
    </div>
  );
}

function Link4() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Margin10 />
      <Container37 />
    </div>
  );
}

function LinkCssTransform4() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[33.04px] items-center justify-center relative shrink-0 w-[23.99px]" style={{ "--transform-inner-width": "300", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link4 />
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNavBarMobile() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(10,10,10,0.9)] bottom-0 content-stretch flex gap-[29.6px] h-[65px] items-center left-0 pl-[31.41px] pr-[30.52px] pt-px w-[390px]" data-name="BottomNavBar (Mobile)">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-solid border-t inset-0 pointer-events-none" />
      <LinkCssTransform />
      <LinkCssTransform1 />
      <LinkCssTransform2 />
      <LinkCssTransform3 />
      <LinkCssTransform4 />
    </div>
  );
}

export default function Component2Dashboard() {
  return (
    <div className="content-stretch flex items-start justify-center relative size-full" style={{ backgroundImage: "linear-gradient(90deg, rgb(250, 246, 240) 0%, rgb(250, 246, 240) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }} data-name="2. Dashboard">
      <MainContentCanvas />
      <BottomNavBarMobile />
    </div>
  );
}