import svgPaths from "./svg-jjaxwr8a01";

function Container() {
  return (
    <div className="absolute content-stretch flex flex-col items-center left-0 pb-[0.8px] top-[-1px]" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[53px] justify-center leading-[0] not-italic relative shrink-0 text-[#e4e0d8] text-[48px] text-center tracking-[-0.96px] w-[200.95px]">
        <p className="leading-[52.8px]">cell_tower</p>
      </div>
    </div>
  );
}

function Margin() {
  return (
    <div className="h-[64.8px] relative shrink-0 w-[200.95px]" data-name="Margin">
      <Container />
    </div>
  );
}

function HeaderStatus() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header & Status">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[7.9px] items-center relative size-full">
        <Margin />
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[29px] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3230] text-[24px] text-center w-[128.7px]">
          <p className="leading-[28.8px]">System Link</p>
        </div>
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[21px] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[14px] text-center w-[271.36px]">
          <p className="leading-[21px]">Establish telemetry connection to hardware unit.</p>
        </div>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[#b83230] text-[11px] tracking-[1.1px] uppercase w-[101.84px]">
          <p className="leading-[11px]">DISCONNECTED</p>
        </div>
      </div>
    </div>
  );
}

function DisconnectedStatusIndicator() {
  return (
    <div className="bg-[#1f0a0a] relative rounded-[16px] shrink-0 w-full" data-name="Disconnected Status Indicator">
      <div aria-hidden="true" className="absolute border border-[#3d1414] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center justify-center p-[13px] relative size-full">
          <div className="bg-[#b83230] rounded-[9999px] shrink-0 size-[8px]" data-name="Background" />
          <Container1 />
        </div>
      </div>
    </div>
  );
}

function Label() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Label">
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#4a4e4a] text-[11px] tracking-[1.1px] uppercase w-full">
        <p className="leading-[11px]">RASPBERRY PI IP ADDRESS</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="flex-[1_0_0] min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip pb-px relative rounded-[inherit] size-full">
        <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#2e3230] text-[14px] tracking-[0.7px] w-full">
          <p className="leading-[normal]">192.168.1.100</p>
        </div>
      </div>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-[#0a0a0a] relative rounded-[16px] shrink-0 w-full" data-name="Input">
      <div className="flex flex-row justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start justify-center pl-[33px] pr-[17px] py-[17px] relative size-full">
          <Container3 />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#1f1f1f] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[13.333px] relative shrink-0 w-[12px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 13.3333">
        <g id="Container">
          <path d={svgPaths.p1b77e300} fill="var(--fill-0, #C4C8BC)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute bottom-0 content-stretch flex items-center left-0 pl-[12px] top-0" data-name="Container">
      <Container5 />
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Container">
      <Input />
      <Container4 />
    </div>
  );
}

function InputSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="Input Section">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[12px] items-start relative size-full">
        <Label />
        <Container2 />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[18px] relative shrink-0 w-[12px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 18">
        <g id="Container">
          <path d={svgPaths.p365a8300} fill="var(--fill-0, black)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#00d1ff] content-stretch drop-shadow-[0px_0px_8px_rgba(0,209,255,0.2)] flex gap-[8px] items-center justify-center py-[16px] relative rounded-[16px] shrink-0 w-full" data-name="Button">
      <Container6 />
      <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[11px] justify-center leading-[0] not-italic relative shrink-0 text-[11px] text-black text-center tracking-[1.1px] uppercase w-[118.2px]">
        <p className="leading-[11px]">CONNECT SYSTEM</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[11.083px] relative shrink-0 w-[12.833px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8333 11.0833">
        <g id="Container">
          <path d={svgPaths.p2e0ed180} fill="var(--fill-0, #B83230)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Container">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[21px] justify-center leading-[0] not-italic relative shrink-0 text-[#b83230] text-[14px] w-[172.55px]">
        <p className="leading-[21px]">Connection Failed: IP Timeout</p>
      </div>
    </div>
  );
}

function ErrorMessage() {
  return (
    <div className="content-stretch flex gap-[7.99px] items-center justify-center opacity-90 relative shrink-0 w-full" data-name="Error Message">
      <Container7 />
      <Container8 />
    </div>
  );
}

function ErrorMessageMargin() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[8px] relative shrink-0 w-full" data-name="Error Message:margin">
      <ErrorMessage />
    </div>
  );
}

function ActionsErrors() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Actions & Errors">
      <Button />
      <ErrorMessageMargin />
    </div>
  );
}

function ActionsErrorsMargin() {
  return (
    <div className="relative shrink-0 w-full" data-name="Actions & Errors:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] relative size-full">
        <ActionsErrors />
      </div>
    </div>
  );
}

function BackgroundBorder() {
  return (
    <div className="bg-[#141414] flex-[1_0_0] max-w-[448px] min-w-px relative rounded-[24px]" data-name="Background+Border">
      <div aria-hidden="true" className="absolute border border-[#1f1f1f] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start max-w-[inherit] p-[25px] relative size-full">
        <div className="absolute bg-[rgba(255,255,255,0)] inset-[0_0_0.01px_0] rounded-[24px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" data-name="Overlay+Shadow" />
        <HeaderStatus />
        <DisconnectedStatusIndicator />
        <InputSection />
        <ActionsErrorsMargin />
      </div>
    </div>
  );
}

function MainContentCanvas() {
  return (
    <div className="min-h-[884px] relative shrink-0 w-full" data-name="Main Content Canvas">
      <div className="flex flex-row items-center justify-center min-h-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-center min-h-[inherit] pb-[200.21px] pt-[216.2px] px-[16px] relative size-full">
          <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[rgba(120,168,134,0.05)] blur-[50px] left-1/2 rounded-[9999px] size-[600px] top-1/2" data-name="Ambient Background Glow" />
          <BackgroundBorder />
        </div>
      </div>
    </div>
  );
}

function Container10() {
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

function Heading() {
  return (
    <div className="content-stretch flex flex-col items-start pr-[7.49px] relative shrink-0" data-name="Heading 1">
      <div className="flex flex-col font-['Nimbus_Sans:Bold',sans-serif] h-[56px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[18px] tracking-[1.8px] uppercase w-[202.7px]">
        <p className="leading-[28px] mb-0">ROBOTIC CONTROL</p>
        <p className="leading-[28px]">UNIT</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Container10 />
        <Heading />
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center pr-[32.09px] relative size-full">
        <div className="bg-[#22d3ee] h-[8px] rounded-[9999px] shrink-0 w-[6.58px]" data-name="Background" />
        <div className="flex flex-col font-['Liberation_Serif:Bold',sans-serif] h-[22px] justify-center leading-[0] not-italic relative shrink-0 text-[#71717a] text-[11px] tracking-[1.1px] w-[69.13px]">
          <p className="leading-[11px] mb-0">192.168.1.5:</p>
          <p className="leading-[11px]">ONLINE</p>
        </div>
      </div>
    </div>
  );
}

function HeaderTopAppBar() {
  return (
    <div className="absolute bg-[#0a0a0a] content-stretch flex h-[64px] items-center justify-between left-0 pb-px px-[16px] top-0 w-[390px]" data-name="Header - TopAppBar">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-b border-solid inset-0 pointer-events-none" />
      <Container9 />
      <Container11 />
    </div>
  );
}

function Container12() {
  return (
    <div className="h-[10px] mb-[-0.221px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 10">
        <g id="Container">
          <path d={svgPaths.pc80eb80} fill="var(--fill-0, #22D3EE)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin1() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] pt-[4px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#22d3ee] text-[10px] tracking-[-0.5px] uppercase w-[60px]">
        <p className="leading-[15px]">CONNECTION</p>
      </div>
    </div>
  );
}

function LinkActiveConnection() {
  return (
    <div className="content-stretch drop-shadow-[0px_0px_4px_rgba(0,209,255,0.4)] flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link - Active: Connection">
      <Container12 />
      <Margin1 />
    </div>
  );
}

function LinkActiveConnectionCssTransform() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link - Active: Connection:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[27.34px] items-center justify-center relative shrink-0 w-[57px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <LinkActiveConnection />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="mb-[-0.221px] relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p20793584} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin2() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] pt-[4px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[57.737px]">
        <p className="leading-[15px]">DASHBOARD</p>
      </div>
    </div>
  );
}

function Link() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Container13 />
      <Margin2 />
    </div>
  );
}

function LinkCssTransform() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pl-[1.1px] pt-[12.08px] relative size-full">
        <div className="flex h-[34.94px] items-center justify-center relative shrink-0 w-[54.85px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="mb-[-0.221px] relative shrink-0 size-[18px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Container">
          <path d={svgPaths.p1f25e00} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin3() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] pt-[4px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[20.179px]">
        <p className="leading-[15px]">MAP</p>
      </div>
    </div>
  );
}

function Link1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Container14 />
      <Margin3 />
    </div>
  );
}

function LinkCssTransform1() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[34.94px] items-center justify-center relative shrink-0 w-[19.17px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link1 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="mb-[-0.221px] relative shrink-0 size-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Container">
          <path d={svgPaths.p9eb1b40} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin4() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] pt-[4px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[48.789px]">
        <p className="leading-[15px]">CONTROLS</p>
      </div>
    </div>
  );
}

function Link2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Container15 />
      <Margin4 />
    </div>
  );
}

function LinkCssTransform2() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[36.84px] items-center justify-center relative shrink-0 w-[46.35px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link2 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="h-[16px] mb-[-0.221px] relative shrink-0 w-[20px]" data-name="Container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
        <g id="Container">
          <path d={svgPaths.p18c14180} fill="var(--fill-0, #52525B)" id="Icon" />
        </g>
      </svg>
    </div>
  );
}

function Margin5() {
  return (
    <div className="content-stretch flex flex-col items-start mb-[-0.221px] pt-[4px] relative shrink-0" data-name="Margin">
      <div className="flex flex-col font-['Liberation_Serif:Regular',sans-serif] h-[15px] justify-center leading-[0] not-italic relative shrink-0 text-[#52525b] text-[10px] tracking-[-0.5px] uppercase w-[24.126px]">
        <p className="leading-[15px]">LOGS</p>
      </div>
    </div>
  );
}

function Link3() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pb-[0.221px] relative" data-name="Link">
      <Container16 />
      <Margin5 />
    </div>
  );
}

function LinkCssTransform3() {
  return (
    <div className="h-[64px] relative shrink-0" data-name="Link:css-transform">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center pb-[11.07px] pt-[12.08px] relative size-full">
        <div className="flex h-[33.04px] items-center justify-center relative shrink-0 w-[22.92px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "42" } as React.CSSProperties}>
          <div className="flex-none scale-x-95 scale-y-95">
            <Link3 />
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNavBarMobile() {
  return (
    <div className="absolute backdrop-blur-[6px] bg-[rgba(10,10,10,0.9)] bottom-0 content-stretch flex gap-[30.5px] h-[65px] items-center left-0 pl-[31.83px] pr-[30.98px] pt-px w-[390px]" data-name="BottomNavBar (Mobile)">
      <div aria-hidden="true" className="absolute border-[#1f1f1f] border-solid border-t inset-0 pointer-events-none" />
      <LinkActiveConnectionCssTransform />
      <LinkCssTransform />
      <LinkCssTransform1 />
      <LinkCssTransform2 />
      <LinkCssTransform3 />
    </div>
  );
}

export default function Component1Connection() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" style={{ backgroundImage: "linear-gradient(90deg, rgb(250, 246, 240) 0%, rgb(250, 246, 240) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }} data-name="1. Connection">
      <MainContentCanvas />
      <HeaderTopAppBar />
      <BottomNavBarMobile />
    </div>
  );
}