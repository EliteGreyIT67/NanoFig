import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  // no custom props
}

const Logo: React.FC<LogoProps> = (props) => {
  return (
    <div className={`inline-flex items-center gap-3 ${props.className}`}>
      <svg
        width="42"
        height="42"
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        <path
          d="M21 0C9.402 0 0 9.402 0 21s9.402 21 21 21 21-9.402 21-21S32.598 0 21 0z"
          fill="#1F2937"
        />
        <path
          d="M26.24 11.23c-1.46-1.5-3.32-2.58-5.38-3.01a1 1 0 00-1.1.72c-.22.9-.8 3.5-2.07 3.5-1.17 0-1.8-2.61-2.06-3.5a1 1 0 00-1.1-.72c-2.43.5-4.57 1.76-6.12 3.51-2.05 2.32-3.1 5.2-3.08 8.16.03 3.6 1.48 6.94 3.9 9.32a1 1 0 001.4-.14c.73-1.04 2.1-2.9 4.37-2.9s3.64 1.86 4.37 2.9a1 1 0 001.4.14c2.42-2.38 3.87-5.72 3.9-9.32.03-2.96-1.02-5.84-3.08-8.16z"
          fill="#FBBF24"
        />
      </svg>
      <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
        NanoFig
      </span>
    </div>
  );
};

export default Logo;
