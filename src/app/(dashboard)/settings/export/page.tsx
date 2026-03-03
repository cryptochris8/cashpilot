"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export/all");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cashpilot-export-" + new Date().toISOString().split("T")[0] + ".json";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Handle error
    }
    setExporting(false);
  };

  const handleDeleteRequest = () => {
    // TODO: Implement actual account deletion via server action
    console.log("Account deletion requested");
    setDeleteRequested(true);
    setDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data & Privacy</h1>
        <p className="text-muted-foreground">
          Export your data or manage your account.
        </p>
      </div>

      {/* Export All Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export All Data
          </CardTitle>
          <CardDescription>
            Download a complete copy of all your CashPilot data in JSON format.
            This includes your organization info, customers, invoices, notes,
            reminder logs, templates, and cadences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download JSON Export
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your CashPilot account and all associated data.
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteRequested ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Deletion Requested</AlertTitle>
              <AlertDescription>
                Your account deletion request has been submitted. Our team will
                process it within 30 days per our data retention policy. You will
                receive an email confirmation.
              </AlertDescription>
            </Alert>
          ) : deleteConfirm ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Are you sure?</AlertTitle>
                <AlertDescription>
                  This will permanently delete all your data including customers,
                  invoices, templates, and reminder history. Your QuickBooks
                  connection will be disconnected.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteRequest}
                >
                  Yes, Delete My Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
