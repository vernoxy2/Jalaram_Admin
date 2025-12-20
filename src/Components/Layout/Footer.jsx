import React from 'react';

const Footer = () => {
  return (
    <div >
      <hr className="mt-8" />
          <p className="text-center pt-4 sm:pt-5 md:pt-6 text-gray-500 text-xs sm:text-sm md:text-base mt-auto">
            © {new Date().getFullYear()} Developed by @Vernoxy
          </p>
    </div>
  );
}

export default Footer;
