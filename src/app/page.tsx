import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/stripe/client";
import {
  FileText,
  Sparkles,
  Clock,
  Shield,
  Mail,
  CheckCircle2,
  ArrowRight,
  Building2,
  Zap,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Dokumentextraktion",
    description:
      "Ladda upp mäklarbild, årsredovisning eller stadgar — AI:n extraherar alla nyckelfält automatiskt.",
  },
  {
    icon: Sparkles,
    title: "AI-genererade texter",
    description:
      "Annonstext, e-postutkast till BRF och köpare/säljare. Genererat på sekunder, anpassat efter din ton.",
  },
  {
    icon: Clock,
    title: "Smarta checklistor",
    description:
      "Automatiska uppgifter för varje fas — från aktivt uppdrag till tillträde. Aldrig missa en deadline.",
  },
  {
    icon: Mail,
    title: "Inbound e-post",
    description:
      "Forwarda dokument direkt till BrokerFlow från din inbox. Bilagor kopplas automatiskt till rätt uppdrag.",
  },
  {
    icon: Shield,
    title: "GDPR-efterlevnad",
    description:
      "Automatisk datalagring och radering. Revisionslogg för alla händelser. Konfigurerbara lagringstider.",
  },
  {
    icon: Zap,
    title: "Kontraktsflöde",
    description:
      "Ladda upp kontraktet — parter, priser och datum extraheras. BRF-ansökan och likvidavräkning genereras.",
  },
];

const PLAN_ORDER = ["starter", "pro", "team"] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BrokerFlow</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Funktioner
            </Link>
            <Link
              href="#pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Priser
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Logga in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Kom igång gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Automatisera din{" "}
            <span className="text-primary">mäklaradministration</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            BrokerFlow minskar administrativt arbete med 60–80% per
            förmedlingsuppdrag. AI-driven dokumentextraktion, automatiska
            checklistor och genererade texter — så att du kan fokusera på
            affären.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Starta gratis provperiod
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Se hur det fungerar
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            14 dagar gratis. Inga kreditkortsuppgifter krävs.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Allt du behöver för effektiv förmedling
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Från första uppdraget till tillträde — BrokerFlow hjälper dig i
              varje steg.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-lg border p-6">
                <feature.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Så fungerar det
          </h2>
          <div className="mt-12 space-y-8">
            {[
              {
                step: "1",
                title: "Skapa ett uppdrag",
                desc: "Ange adress, bostadstyp och eventuell säljare. En checklista skapas automatiskt.",
              },
              {
                step: "2",
                title: "Ladda upp dokument",
                desc: "Dra och släpp eller forwarda mail med bilagor. AI:n extraherar nyckelfält från mäklarbild, stadgar och årsredovisning.",
              },
              {
                step: "3",
                title: "Granska och godkänn",
                desc: "Bekräfta den extraherade datan. Generera annonstext, e-postutkast och mallar med ett klick.",
              },
              {
                step: "4",
                title: "Driv affären framåt",
                desc: "Följ checklistor, skicka e-post, hantera kontrakt. Allt loggas för spårbarhet och GDPR.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Enkla, transparenta priser
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Starta med 14 dagars gratis provperiod. Ingen bindningstid.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isPopular = planId === "pro";

              return (
                <div
                  key={planId}
                  className={`relative flex flex-col rounded-lg border p-6 ${
                    isPopular ? "border-primary shadow-lg" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                      Populärast
                    </div>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {plan.priceLabel.split("/")[0]}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">
                        /{plan.priceLabel.split("/")[1]}
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-6">
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                    >
                      Starta gratis
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              <Users className="mr-1 inline h-4 w-4" />
              Behöver du Enterprise med anpassade workflows och API?{" "}
              <a
                href="mailto:kontakt@brokerflow.se"
                className="font-medium text-primary hover:underline"
              >
                Kontakta oss
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Redo att effektivisera din mäklarvardag?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Börja gratis idag. Ingen bindningstid, inga kreditkortsuppgifter.
          </p>
          <Link href="/register">
            <Button size="lg" className="mt-8 gap-2">
              Skapa konto gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              BrokerFlow — Automatiserad mäklaradministration
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Logga in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Registrera
            </Link>
            <a
              href="mailto:kontakt@brokerflow.se"
              className="hover:text-foreground"
            >
              Kontakt
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
