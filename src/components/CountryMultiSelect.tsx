import { workLocationCountries } from "@/data/settingsData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, Globe } from "lucide-react";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (countries: string[]) => void;
  className?: string;
}

export function CountryMultiSelect({ value, onChange, className }: CountryMultiSelectProps) {
  const isAll = value.length === 0;

  const toggle = (country: string) => {
    if (value.includes(country)) {
      onChange(value.filter(c => c !== country));
    } else {
      onChange([...value, country]);
    }
  };

  const selectAll = () => onChange([]);

  const displayLabel = isAll
    ? "All Countries"
    : value.length <= 2
      ? value.join(", ")
      : `${value.length} countries`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between font-normal ${className || "w-full"}`}>
          <span className="flex items-center gap-2 truncate">
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {displayLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" align="start">
        <div className="flex items-center gap-2">
          <Checkbox
            id="all-countries"
            checked={isAll}
            onCheckedChange={() => selectAll()}
          />
          <Label htmlFor="all-countries" className="text-sm font-medium cursor-pointer">All Countries</Label>
        </div>
        <div className="border-t pt-2 space-y-1.5 max-h-48 overflow-y-auto">
          {workLocationCountries.map(country => (
            <div key={country} className="flex items-center gap-2">
              <Checkbox
                id={`country-${country}`}
                checked={value.includes(country)}
                onCheckedChange={() => toggle(country)}
              />
              <Label htmlFor={`country-${country}`} className="text-sm cursor-pointer">{country}</Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CountryBadges({ countries }: { countries?: string[] }) {
  if (!countries || countries.length === 0) return <span className="text-sm">All Countries</span>;
  if (countries.length <= 2) {
    return (
      <div className="flex gap-1 flex-wrap">
        {countries.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
      </div>
    );
  }
  return <span className="text-sm">{countries.length} countries</span>;
}
