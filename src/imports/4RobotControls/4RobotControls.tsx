import svgPaths from "./svg-2jz6hmoiz2";

function Container1() {
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

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[4.38px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[56px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[18px] tracking-[1.8px] uppercase w-[202.7px]">
        <p className="leading-[28px] mb-0">ROBOTIC CONTROL</p>
        <p className="leading-[28px]">UNIT</p>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Container1 />
        <Container2 />
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[36.11px] relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[14px] tracking-[0.7px] w-[78.8px]">
          <p className="leading-[14px] mb-0">192.168.1.5:</p>
          <p className="leading-[14px]">ONLINE</p>
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="bg-[#0a0a0a] h-[64px] relative shrink-0 w-full z-[2]" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between pb-px px-[16px] relative size-full">
          <Container />
          <Container3 />
        </div>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase w-full">
        <p className="leading-[11px]">CONTROL MODE</p>
      </div>
    </div>
  );
}

function Margin() {
  return (
    <div className="content-stretch flex flex-col items-start pb-[4px] relative shrink-0 w-full" data-name="Margin">
      <Container5 />
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[65.74px] relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[28px] justify-center leading-[0] not-italic relative shrink-0 text-[#78a886] text-[14px] tracking-[0.7px] w-[76.37px]">
        <p className="leading-[14px] mb-0">MANUAL</p>
        <p className="leading-[14px]">OVERRIDE</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <div className="bg-[#78a886] h-[8px] rounded-[9999px] shadow-[0px_0px_16px_0px_rgba(0,209,255,0.25)] shrink-0 w-[7.8px]" data-name="Background+Shadow" />
      <Container7 />
    </div>
  );
}

function Container4() {
  return (
    <div className="relative shrink-0 w-[157.91px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Margin />
        <Container6 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="relative rounded-[9999px] shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] text-center tracking-[1.1px] w-[35.98px]">
          <p className="leading-[11px]">AUTO</p>
        </div>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#78a886] drop-shadow-[0px_0px_8px_rgba(0,209,255,0.25)] relative rounded-[9999px] shrink-0" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center justify-center px-[16px] py-[8px] relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[11px] text-center text-white tracking-[1.1px] w-[56.11px]">
          <p className="leading-[11px]">MANUAL</p>
        </div>
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#eae6de] relative rounded-[9999px] shrink-0" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start p-[5px] relative size-full">
        <Button />
        <Button1 />
      </div>
    </div>
  );
}

function ModeToggleStatus() {
  return (
    <div className="bg-[#faf6f0] max-w-[448px] relative rounded-[16px] shrink-0 w-full" data-name="Mode Toggle & Status">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center max-w-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between max-w-[inherit] p-[17px] relative size-full">
          <Container4 />
          <BackgroundBorder />
        </div>
      </div>
    </div>
  );
}

function UndefinedAlignFlexStart() {
  return (
    <div className="relative shrink-0 w-[310px]" data-name="undefined:align-flex-start">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pl-px pr-[168.84px] relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase w-[140.16px]">
          <p className="leading-[11px]">MOVEMENT VECTORS</p>
        </div>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[11.1px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 11.1">
        <g id="Container">
          <path d={svgPaths.p17c37280} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#eae6de] col-2 content-stretch flex items-center justify-center justify-self-start px-[22px] py-[20px] relative rounded-[16px] row-1 self-start shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Container9 />
    </div>
  );
}

function Container10() {
  return (
    <div className="h-[18px] relative shrink-0 w-[11.1px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.1 18">
        <g id="Container">
          <path d={svgPaths.p1bed1dc0} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function ButtonMiddleRow() {
  return (
    <div className="bg-[#eae6de] col-1 content-stretch flex items-center justify-center justify-self-start px-[22px] py-[20px] relative rounded-[16px] row-2 self-start shrink-0" data-name="Button - Middle Row">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Container10 />
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-white col-2 content-stretch flex items-center justify-center justify-self-start pb-[33.5px] pl-[22.66px] pr-[22.65px] pt-[32.5px] relative rounded-[16px] row-2 self-start shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[14px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] text-center tracking-[0.7px] w-[34.69px]">
        <p className="leading-[14px]">IDLE</p>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[18px] relative shrink-0 w-[11.1px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.1 18">
        <g id="Container">
          <path d={svgPaths.p18f53580} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#eae6de] col-3 content-stretch flex items-center justify-center justify-self-start px-[22px] py-[20px] relative rounded-[16px] row-2 self-start shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Container11 />
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[11.1px] relative shrink-0 w-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 11.1">
        <g id="Container">
          <path d={svgPaths.p163ad800} fill="var(--fill-0, #4A4E4A)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[#eae6de] col-2 content-stretch flex items-center justify-center justify-self-start px-[22px] py-[20px] relative rounded-[16px] row-3 self-start shrink-0" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Container12 />
    </div>
  );
}

function Container8() {
  return (
    <div className="relative shrink-0 size-[256px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[8px] gap-y-[8px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(3,minmax(0,1fr))] relative size-full">
        <Button2 />
        <ButtonMiddleRow />
        <Button3 />
        <Button4 />
        <Button5 />
      </div>
    </div>
  );
}

function DPadControl() {
  return (
    <div className="bg-[#faf6f0] max-w-[448px] relative rounded-[24px] shrink-0 w-full" data-name="D-Pad Control">
      <div aria-hidden="true" className="absolute border border-[rgba(120,168,134,0.3)] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="flex flex-col items-center max-w-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center max-w-[inherit] p-[25px] relative size-full">
          <UndefinedAlignFlexStart />
          <Container8 />
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase w-[110.05px]">
        <p className="leading-[11px]">VELOCITY LIMIT</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="font-['Liberation_Serif:Regular',sans-serif] h-[14px] leading-[0] not-italic relative shrink-0 tracking-[0.7px] w-[31.83px]" data-name="Paragraph">
      <div className="-translate-y-1/2 absolute flex flex-col h-[14px] justify-center left-0 text-[#78a886] text-[14px] top-[6.5px] w-[19.61px]">
        <p className="leading-[14px]">{`45 `}</p>
      </div>
      <div className="-translate-y-1/2 absolute flex flex-col h-[7px] justify-center left-[19.61px] text-[#4a4e4a] text-[7px] top-[9px] w-[12.22px]">
        <p className="leading-[7px]">m/s</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-end justify-between relative size-full">
        <Container14 />
        <Paragraph />
      </div>
    </div>
  );
}

function Container16() {
  return <div className="flex-[1_0_0] h-[16px] min-w-px" data-name="Container" />;
}

function Container15() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-0 right-0 top-[-4px]" data-name="Container">
      <Container16 />
    </div>
  );
}

function Input() {
  return (
    <div className="bg-[#eae6de] h-[8px] relative rounded-[16px] shrink-0 w-full" data-name="Input">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container15 />
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#74796e] text-[10px] w-[5px]">
        <p className="leading-[15px]">0</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="h-[6.748px] relative shrink-0 w-[9.038px]" data-name="Icon">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.03809 6.74805">
          <path d={svgPaths.p22d9b700} fill="var(--fill-0, #74796E)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col items-start relative self-stretch shrink-0" data-name="Container">
      <div className="h-[6.748px] relative shrink-0 w-[13.74px]" data-name="Icon">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.7402 6.74805">
          <path d={svgPaths.p35b613a0} fill="var(--fill-0, #74796E)" id="Icon" />
        </svg>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="h-[15px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-between relative size-full">
        <Container18 />
        <Container19 />
        <Container20 />
      </div>
    </div>
  );
}

function SpeedSlider() {
  return (
    <div className="bg-[#faf6f0] max-w-[448px] relative rounded-[16px] shrink-0 w-full" data-name="Speed Slider">
      <div aria-hidden="true" className="absolute border border-[#c4c8bc] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start max-w-[inherit] p-[17px] relative size-full">
        <Container13 />
        <Input />
        <Container17 />
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[28.5px] relative shrink-0 w-[33px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 28.5">
        <g id="Container">
          <path d={svgPaths.p332fa240} fill="var(--fill-0, white)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function ButtonEmergencyStop() {
  return (
    <div className="bg-[#ff3b3b] drop-shadow-[0px_0px_12px_rgba(255,59,59,0.4)] max-w-[448px] relative rounded-[24px] shrink-0 w-full" data-name="Button - Emergency Stop">
      <div aria-hidden="true" className="absolute border-2 border-[#ff3b3b] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="flex flex-row items-center justify-center max-w-[inherit] size-full">
        <div className="content-stretch flex gap-[50.86px] items-center justify-center max-w-[inherit] pl-[26px] pr-[64.86px] py-[26px] relative size-full">
          <Container21 />
          <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[58px] justify-center leading-[0] not-italic relative shrink-0 text-[24px] text-center text-white tracking-[2.4px] uppercase w-[180.28px]">
            <p className="leading-[28.8px] mb-0">EMERGENCY</p>
            <p className="leading-[28.8px]">STOP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ButtonEmergencyStopMargin() {
  return (
    <div className="content-stretch flex flex-col items-start max-w-[448px] pt-[12px] relative shrink-0 w-full" data-name="Button - Emergency Stop:margin">
      <ButtonEmergencyStop />
    </div>
  );
}

function Canvas() {
  return (
    <div className="relative shrink-0 w-full z-[1]" data-name="Canvas">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center justify-center pb-[116.21px] pt-[4.2px] px-[16px] relative size-full">
          <ModeToggleStatus />
          <DPadControl />
          <SpeedSlider />
          <ButtonEmergencyStopMargin />
        </div>
      </div>
    </div>
  );
}

function MainContentArea() {
  return (
    <div className="content-stretch flex flex-col isolate items-start overflow-clip relative shrink-0 w-full" data-name="Main Content Area">
      <HeaderTopAppBar />
      <Canvas />
    </div>
  );
}

function Container22() {
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

function Link() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Link">
      <Container22 />
    </div>
  );
}

function LinkCssTransform() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex h-[9.5px] items-center justify-center relative shrink-0 w-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container23() {
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

function Link1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Link">
      <Container23 />
    </div>
  );
}

function LinkCssTransform1() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[17.1px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link1 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container24() {
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

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Link">
      <Container24 />
    </div>
  );
}

function LinkCssTransform2() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[17.1px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link2 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p7ff1bb4} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch drop-shadow-[0px_0px_4px_rgba(0,209,255,0.4)] flex flex-col items-center justify-center relative" data-name="Link">
      <Container25 />
    </div>
  );
}

function LinkCssTransform3() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex items-center justify-center relative shrink-0 size-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link3 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container26() {
  return (
    <div className="h-[16px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
        <g id="Container">
          <path d={svgPaths.p18c14180} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Link4() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative" data-name="Link">
      <Container26 />
    </div>
  );
}

function LinkCssTransform4() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[20.1px] pt-[21.1px] relative size-full">
        <div className="flex h-[15.2px] items-center justify-center relative shrink-0 w-[19px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21" } as React.CSSProperties}>
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
    <div className="absolute backdrop-blur-[6px] bg-[rgba(10,10,10,0.9)] bottom-[0.41px] content-stretch flex gap-[48.8px] h-[65px] items-center left-0 pl-[40.38px] pr-[40.43px] pt-px w-[390px]" data-name="BottomNavBar (Mobile)">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-solid border-t inset-0 pointer-events-none" />
      <LinkCssTransform />
      <LinkCssTransform1 />
      <LinkCssTransform2 />
      <LinkCssTransform3 />
      <LinkCssTransform4 />
    </div>
  );
}

export default function Component4RobotControls() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" style={{ backgroundImage: "linear-gradient(90deg, rgb(10, 10, 10) 0%, rgb(10, 10, 10) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }} data-name="4. Robot Controls">
      <MainContentArea />
      <BottomNavBarMobile />
    </div>
  );
}