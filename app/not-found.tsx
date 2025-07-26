"use client"

import Link from 'next/link';

const NotFound = () => {

  return (
    <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
      <div className="min-h-screen flex items-center justify-center bg-gray-100 w-full p-4">
        <div className="text-center break-words max-w-full">
          <h1 className="text-4xl font-bold mb-4 break-words max-w-full truncate">404</h1>
          <p className="text-xl text-gray-600 mb-4 break-words max-w-full">Oops! Page not found</p>
          <Link href="/" className="text-primary hover:underline font-medium break-words max-w-full">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
