interface ProductCardProps {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryName?: string;
}

export function ProductCard({ name, description, price, imageUrl, categoryName }: ProductCardProps) {
  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="aspect-square overflow-hidden bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        {categoryName && (
          <span className="text-xs font-body font-medium text-accent uppercase tracking-wider">
            {categoryName}
          </span>
        )}
        <h3 className="font-display text-lg font-semibold text-foreground mt-1 line-clamp-1">{name}</h3>
        {description && (
          <p className="text-sm font-body text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
        <p className="font-display text-xl font-bold text-primary mt-3">
          ${price.toFixed(2)} MXN
        </p>
      </div>
    </div>
  );
}
