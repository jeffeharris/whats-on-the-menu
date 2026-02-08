import type { ReactNode } from 'react';

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function CategorySection({ title, subtitle, children }: CategorySectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 font-heading">{title}</h2>
        {subtitle && (
          <p className="text-lg text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 justify-items-center max-w-3xl mx-auto px-2">
        {children}
      </div>
    </section>
  );
}
