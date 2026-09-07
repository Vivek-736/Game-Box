"use client";

import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper 
      className="min-h-screen w-full flex justify-center items-center bg-background text-foreground transition-colors duration-300"
    >
      <div className="dot-spinner">
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
        <div className="dot-spinner__dot" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .dot-spinner {
    --uib-size: 2.8rem;
    --uib-speed: 0.9s;
    --dot-bg: linear-gradient(180deg, #8f71ff 0%, #7b57ff 50%, #6841ff 100%);
    --dot-shadow: 0 0 16px rgba(123, 87, 255, 0.45);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: var(--uib-size);
    width: var(--uib-size);
  }

  :global(html.dark) .dot-spinner,
  :global(.dark) .dot-spinner,
  :global([data-theme="dark"]) .dot-spinner {
    --dot-shadow: 0 0 20px rgba(143, 113, 255, 0.7), 0 0 6px rgba(123, 87, 255, 0.9);
  }

  .dot-spinner__dot {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
    width: 100%;
  }

  .dot-spinner__dot::before {
    content: "";
    height: 20%;
    width: 20%;
    border-radius: 50%;
    background: var(--dot-bg);
    transform: scale(0);
    opacity: 0.5;
    animation: pulse0112 calc(var(--uib-speed) * 1.111) ease-in-out infinite;
    box-shadow: var(--dot-shadow);
    transition: box-shadow 0.3s ease;
  }

  .dot-spinner__dot:nth-child(2) {
    transform: rotate(45deg);
  }

  .dot-spinner__dot:nth-child(2)::before {
    animation-delay: calc(var(--uib-speed) * -0.875);
  }

  .dot-spinner__dot:nth-child(3) {
    transform: rotate(90deg);
  }

  .dot-spinner__dot:nth-child(3)::before {
    animation-delay: calc(var(--uib-speed) * -0.75);
  }

  .dot-spinner__dot:nth-child(4) {
    transform: rotate(135deg);
  }

  .dot-spinner__dot:nth-child(4)::before {
    animation-delay: calc(var(--uib-speed) * -0.625);
  }

  .dot-spinner__dot:nth-child(5) {
    transform: rotate(180deg);
  }

  .dot-spinner__dot:nth-child(5)::before {
    animation-delay: calc(var(--uib-speed) * -0.5);
  }

  .dot-spinner__dot:nth-child(6) {
    transform: rotate(225deg);
  }

  .dot-spinner__dot:nth-child(6)::before {
    animation-delay: calc(var(--uib-speed) * -0.375);
  }

  .dot-spinner__dot:nth-child(7) {
    transform: rotate(270deg);
  }

  .dot-spinner__dot:nth-child(7)::before {
    animation-delay: calc(var(--uib-speed) * -0.25);
  }

  .dot-spinner__dot:nth-child(8) {
    transform: rotate(315deg);
  }

  .dot-spinner__dot:nth-child(8)::before {
    animation-delay: calc(var(--uib-speed) * -0.125);
  }

  @keyframes pulse0112 {
    0%,
    100% {
      transform: scale(0);
      opacity: 0.5;
    }

    50% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

export default Loader;
