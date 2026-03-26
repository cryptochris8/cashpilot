"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LinkIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Unlink,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";

interface QboStatus {
  connected: boolean;
  realmId?: string;
  lastSyncAt?: string | null;
  syncStatus?: string;
  syncError?: string | null;
  tokenExpiresAt?: string;
  status?: "active" | "error" | "disconnected";
}

interface SyncResult {
  success?: boolean;
  error?: string;
  customersUpserted?: number;
  invoicesUpserted?: number;
  invoicesPaid?: number;
  errors?: string[];
}

export function QboConnectionCard() {
  const [qboStatus, setQboStatus] = useState<QboStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/qbo/status");
      if (res.ok) {
        const data = await res.json();
        setQboStatus(data);
      } else {
        setQboStatus({ connected: false });
      }
    } catch {
      setQboStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    window.location.href = "/api/qbo/connect";
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/qbo/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        await fetchStatus();
      } else {
        setSyncResult({ error: data.error || "Sync failed" });
      }
    } catch {
      setSyncResult({ error: "Network error during sync" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/qbo/disconnect", { method: "POST" });
      if (res.ok) {
        setQboStatus({ connected: false });
        setShowDisconnectDialog(false);
      }
    } catch {
      // Handle error
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          QuickBooks Online
        </CardTitle>
        <CardDescription>
          Connect your QuickBooks Online account to automatically sync
          invoices, customers, and payment data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection status...
          </div>
        ) : qboStatus?.connected ? (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {qboStatus.status === "active" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : qboStatus.status === "error" ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {qboStatus.status === "active"
                    ? "Connected"
                    : qboStatus.status === "error"
                    ? "Connection Error"
                    : "Disconnected"}
                </span>
                <Badge variant="secondary">
                  Realm: {qboStatus.realmId}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing || qboStatus.syncStatus === "syncing"}
                >
                  {syncing || qboStatus.syncStatus === "syncing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disconnect QuickBooks</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to disconnect your QuickBooks
                        account? This will stop invoice syncing. Your existing
                        data will be preserved.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDisconnectDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Last Sync Info */}
            {qboStatus.lastSyncAt && (
              <p className="text-sm text-muted-foreground">
                Last synced: {formatTimeAgo(qboStatus.lastSyncAt)}
              </p>
            )}

            {/* Sync Error */}
            {qboStatus.syncError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Sync Error</AlertTitle>
                <AlertDescription>{qboStatus.syncError}</AlertDescription>
              </Alert>
            )}

            {/* Sync Result */}
            {syncResult && (
              <Alert variant={syncResult.error ? "destructive" : "default"}>
                {syncResult.error ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertTitle>
                  {syncResult.error ? "Sync Failed" : "Sync Complete"}
                </AlertTitle>
                <AlertDescription>
                  {syncResult.error ? (
                    syncResult.error
                  ) : (
                    <span>
                      {syncResult.customersUpserted} customers,{" "}
                      {syncResult.invoicesUpserted} invoices synced
                      {(syncResult.invoicesPaid ?? 0) > 0 &&
                        ", " + syncResult.invoicesPaid + " marked as paid"}
                      {syncResult.errors && syncResult.errors.length > 0 &&
                        " (" + syncResult.errors.length + " errors)"}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Not connected</span>
            </div>
            <Button onClick={handleConnect}>
              Connect to QuickBooks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
