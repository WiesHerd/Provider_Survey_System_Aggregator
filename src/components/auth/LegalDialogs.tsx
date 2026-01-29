import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { StandardDialog } from '../../shared/components';

export interface LegalDialogsProps {
  isTermsOpen: boolean;
  isPrivacyOpen: boolean;
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
}

export const LegalDialogs: React.FC<LegalDialogsProps> = ({
  isTermsOpen,
  isPrivacyOpen,
  onCloseTerms,
  onClosePrivacy,
}) => {
  return (
    <>
      <StandardDialog
        open={isTermsOpen}
        onClose={onCloseTerms}
        title="Terms of Service"
        subtitle="Last updated: Jan 17, 2026"
        maxWidth="sm"
        actions={
          <Button variant="outlined" onClick={onCloseTerms}>
            Close
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            These Terms of Service govern your use of BenchPoint. By creating an account, you
            agree to the terms below.
          </Typography>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Account responsibilities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are responsible for safeguarding your credentials and all activity that occurs
              under your account.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Acceptable use
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You agree not to misuse the service or attempt to access other users&apos; data.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Data ownership
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You retain ownership of your data. We only process and store it to provide the
              service.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Changes and termination
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We may update these terms over time and may suspend accounts for misuse.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Questions? Contact us at support@benchpoint.app.
          </Typography>
        </Box>
      </StandardDialog>

      <StandardDialog
        open={isPrivacyOpen}
        onClose={onClosePrivacy}
        title="Privacy Policy"
        subtitle="Last updated: Jan 17, 2026"
        maxWidth="sm"
        actions={
          <Button variant="outlined" onClick={onClosePrivacy}>
            Close
          </Button>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            This Privacy Policy explains how BenchPoint handles your information.
          </Typography>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Data we collect
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We collect account details (email) and any survey data you upload to use the app.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              How we use data
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Data is used to provide analytics, mapping, and reporting features. We do not sell
              your data.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Storage and security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your data is stored in your own Firebase tenant scope and protected by access rules.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Retention and deletion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can request data deletion by contacting support. We will remove your account data
              within a reasonable timeframe.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Questions? Contact us at support@benchpoint.app.
          </Typography>
        </Box>
      </StandardDialog>
    </>
  );
};
