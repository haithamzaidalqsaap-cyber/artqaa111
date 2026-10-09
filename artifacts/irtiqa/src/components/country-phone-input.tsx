import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";

export interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { id: "IQ", name: "العراق", code: "+964", flag: "🇮🇶" },
  { id: "SA", name: "السعودية", code: "+966", flag: "🇸🇦" },
  { id: "AE", name: "الإمارات", code: "+971", flag: "🇦🇪" },
  { id: "KW", name: "الكويت", code: "+965", flag: "🇰🇼" },
  { id: "QA", name: "قطر", code: "+974", flag: "🇶🇦" },
  { id: "OM", name: "عُمان", code: "+968", flag: "🇴🇲" },
  { id: "BH", name: "البحرين", code: "+973", flag: "🇧🇭" },
  { id: "JO", name: "الأردن", code: "+962", flag: "🇯🇴" },
  { id: "EG", name: "مصر", code: "+20", flag: "🇪🇬" },
  { id: "LB", name: "لبنان", code: "+961", flag: "🇱🇧" },
  { id: "SY", name: "سوريا", code: "+963", flag: "🇸🇾" },
  { id: "PS", name: "فلسطين", code: "+970", flag: "🇵🇸" },
  { id: "YE", name: "اليمن", code: "+967", flag: "🇾🇪" },
  { id: "TN", name: "تونس", code: "+216", flag: "🇹🇳" },
  { id: "DZ", name: "الجزائر", code: "+213", flag: "🇩🇿" },
  { id: "MA", name: "المغرب", code: "+212", flag: "🇲🇦" },
  { id: "LY", name: "ليبيا", code: "+218", flag: "🇱🇾" },
  { id: "SD", name: "السودان", code: "+249", flag: "🇸🇩" },
  { id: "TR", name: "تركيا", code: "+90", flag: "🇹🇷" },
  { id: "IR", name: "إيران", code: "+98", flag: "🇮🇷" },
  { id: "US", name: "أمريكا", code: "+1", flag: "🇺🇸" },
  { id: "GB", name: "المملكة المتحدة", code: "+44", flag: "🇬🇧" },
  { id: "DE", name: "ألمانيا", code: "+49", flag: "🇩🇪" },
  { id: "FR", name: "فرنسا", code: "+33", flag: "🇫🇷" },
  { id: "SE", name: "السويد", code: "+46", flag: "🇸🇪" },
  { id: "NL", name: "هولندا", code: "+31", flag: "🇳🇱" },
  { id: "CA", name: "كندا", code: "+1", flag: "🇨🇦" },
  { id: "AU", name: "أستراليا", code: "+61", flag: "🇦🇺" },
  { id: "MY", name: "ماليزيا", code: "+60", flag: "🇲🇾" },
  { id: "AZ", name: "أذربيجان", code: "+994", flag: "🇦🇿" },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  label?: string;
  testid?: string;
  auto?: string;
  placeholder?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  label = "رقم الهاتف",
  testid = "input-phone",
  auto = "tel",
  placeholder = "751XXXXXXX",
}: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]!); // Default to Iraq (+964)
  const [localNumber, setLocalNumber] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Parse initial value if it starts with a known country code
  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }
    const clean = value.trim();
    const matched = COUNTRIES.find((c) => clean.startsWith(c.code));
    if (matched) {
      setSelectedCountry(matched);
      setLocalNumber(clean.slice(matched.code.length));
    } else if (clean.startsWith("+")) {
      setLocalNumber(clean);
    } else {
      setLocalNumber(clean);
    }
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch("");
    const cleanedLocal = localNumber.replace(/^0+/, "");
    if (cleanedLocal) {
      onChange(`${country.code}${cleanedLocal}`);
    } else {
      onChange("");
    }
  };

  const handleNumberChange = (raw: string) => {
    // Only accept numeric digits
    const digitsOnly = raw.replace(/[^\d]/g, "");
    setLocalNumber(digitsOnly);

    // If starts with 0, strip leading 0 for international format
    const cleaned = digitsOnly.replace(/^0+/, "");
    if (cleaned) {
      onChange(`${selectedCountry.code}${cleaned}`);
    } else {
      onChange("");
    }
  };

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.trim().toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.code.replace("+", "").includes(q)
    );
  }, [search]);

  return (
    <div className="block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {localNumber && (
          <span className="text-[11px] text-primary/80 num font-mono" dir="ltr">
            {selectedCountry.code} {localNumber.replace(/^0+/, "")}
          </span>
        )}
      </div>

      <div className="relative flex items-center rounded-[.9rem] border border-[hsl(200_20%_24%)] bg-[hsl(205_36%_7%/.6)] focus-within:border-[hsl(40_62%_68%/.7)] focus-within:ring-4 focus-within:ring-[hsl(40_62%_68%/.12)] transition-all">
        {/* Country Selector Trigger */}
        <button
          type="button"
          data-testid="button-select-country"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-3 rounded-r-[.9rem] border-l border-border/40 hover:bg-white/5 transition-colors shrink-0 text-sm font-medium"
          title="اختر الدولة"
        >
          <span className="text-lg leading-none">{selectedCountry.flag}</span>
          <span className="num font-semibold text-foreground/90 font-mono text-xs sm:text-sm" dir="ltr">
            {selectedCountry.code}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
        </button>

        {/* Local Number Input */}
        <input
          data-testid={testid}
          type="tel"
          inputMode="numeric"
          autoComplete={auto}
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="w-full bg-transparent px-3 py-3 text-sm sm:text-base text-foreground font-mono num outline-none placeholder:text-muted-foreground/50 text-left"
        />
      </div>

      {/* Country Selection Modal / Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-border/50 bg-[#161b24] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">رمز الدولة</h3>
                    <p className="text-xs text-muted-foreground">اختر دولتك لإدخال رقم الهاتف بشكل صحيح</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="button-close-country-modal"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-border/20 bg-background/20">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن الدولة أو الرمز (مثال: العراق أو 964)..."
                    className="w-full rounded-xl bg-background/50 border border-border/40 pr-9 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 transition-colors"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country List (matching screenshots layout) */}
              <div className="overflow-y-auto divide-y divide-border/10 p-2 space-y-0.5">
                {filteredCountries.map((country) => {
                  const isSelected = selectedCountry.id === country.id;
                  return (
                    <div
                      key={country.id}
                      data-testid={`country-option-${country.id}`}
                      onClick={() => handleCountrySelect(country)}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      {/* Left: Radio Indicator (matching screenshots) */}
                      <div className="flex items-center">
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/20"
                              : "border-muted-foreground/40 bg-transparent"
                          }`}
                        >
                          {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                      </div>

                      {/* Right: Flag + Name (+Code) (matching screenshots) */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm sm:text-base font-medium text-foreground">
                          {country.name} ({country.code})
                        </span>
                        <span className="text-xl sm:text-2xl leading-none">{country.flag}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredCountries.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    لا توجد دولة تطابق بحثك "{search}"
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
