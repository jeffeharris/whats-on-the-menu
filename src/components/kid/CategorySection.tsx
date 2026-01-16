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
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {subtitle && (
          <p className="text-lg text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {children}
      </div>
    </section>
  );
}
