export function BrandMonogram({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 50L26.5 14H30.5L40 42.5C41.2 46.2 43.2 48.6 46 49.6V51H35V49.6C37.2 49.1 38.1 47.7 37.3 45.2L34.7 37.5H21.2L18.4 45.2C17.6 47.6 18.7 49 21.2 49.6V51H11V49.6C12.5 49 13.3 47.9 14 50ZM22.4 34.2H33.6L28 17.8L22.4 34.2Z"
        fill="currentColor"
      />
      <path
        d="M34 15.5H52.5L51.8 22H50.3C49.6 18.4 47.7 17.4 43.8 17.4H39.2V30.8H43.4C46.5 30.8 47.9 29.8 48.5 26.8H50V36.8H48.5C47.9 33.8 46.5 32.8 43.4 32.8H39.2V45.4C39.2 48.3 40.3 49.4 43.2 49.8V51H32.5V49.8C35.1 49.3 36 48.2 36 45.4V19.6C36 17.2 35.3 16.4 34 16.1V15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
