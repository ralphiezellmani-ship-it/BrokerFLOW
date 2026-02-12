"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Mail, Copy, Check } from "lucide-react";

interface InboundEmailInfoProps {
  tenantId: string;
}

export function InboundEmailInfo({ tenantId }: InboundEmailInfoProps) {
  const [alias, setAlias] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const domain = process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN || "in.brokerflow.se";

  useEffect(() => {
    async function fetchAlias() {
      const supabase = createClient();
      const { data } = await supabase
        .from("inbound_aliases")
        .select("email_alias")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(1)
        .single();
      setAlias(data?.email_alias || null);
      setLoading(false);
    }
    fetchAlias();
  }, [tenantId]);

  const fullEmail = alias ? `${alias}@${domain}` : null;

  async function handleCopy() {
    if (!fullEmail) return;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LoadingSpinner text="Laddar e-postadress..." />;
  }

  if (!fullEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inkommande e-post
          </CardTitle>
          <CardDescription>
            Ingen inbound-adress konfigurerad. Kontakta support.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Inkommande e-post
        </CardTitle>
        <CardDescription>
          Forwarda e-post med bilagor (mäklarbild, årsredovisning etc.) till
          denna adress. Bilagor sparas automatiskt som dokument.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
            {fullEmail}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tips: Inkludera <code>[BF-&lt;uppdrag-id&gt;]</code> i ämnesraden
          för att automatiskt koppla bilagor till ett specifikt uppdrag.
        </p>
      </CardContent>
    </Card>
  );
}
