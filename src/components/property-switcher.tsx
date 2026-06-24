"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property } from "@/types";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertySwitcherProps {
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null) => void;
}

const PropertySwitcher = ({
  selectedPropertyId,
  onPropertyChange,
}: PropertySwitcherProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .order("name");

      if (data) {
        setProperties(data);
      }
      setLoading(false);
    };

    fetchProperties();
  }, []);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  if (loading) {
    return (
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No properties yet
      </div>
    );
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors sm:min-w-[200px]"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select property"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left truncate">
          {selectedPropertyId === null
            ? "All Properties"
            : selectedProperty?.name || "Select property"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-full rounded-lg border border-border bg-card py-1 shadow-lg z-50"
          role="listbox"
        >
          <button
            onClick={() => {
              onPropertyChange(null);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
              selectedPropertyId === null && "bg-primary/10 text-primary"
            )}
            role="option"
            aria-selected={selectedPropertyId === null}
          >
            All Properties
          </button>
          {properties.map((property) => (
            <button
              key={property.id}
              onClick={() => {
                onPropertyChange(property.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
                selectedPropertyId === property.id &&
                  "bg-primary/10 text-primary"
              )}
              role="option"
              aria-selected={selectedPropertyId === property.id}
            >
              {property.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertySwitcher;
