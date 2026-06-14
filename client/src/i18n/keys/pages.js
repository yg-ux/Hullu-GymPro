// Page-specific translation keys for Kiosk, Receipt, and SubscriptionPage
export const pages = {
  en: {
    // ─── Kiosk ───────────────────────────────────────────────────────────────
    'kiosk.exitKiosk':            'Exit Kiosk',
    'kiosk.title':                'Member Check-in',
    'kiosk.subtitle':             'Enter your phone number to check in',
    'kiosk.phonePlaceholder':     'Phone number',
    'kiosk.cancel':               'Cancel',
    'kiosk.checkIn':              'Check In',

    // Result screens
    'kiosk.checkInSuccess':       'Check-in successful',
    'kiosk.resetting':            'Resetting in a moment…',
    'kiosk.membershipFrozen':     'Membership Frozen',
    'kiosk.seeStaffUnfreeze':     'Please see staff to unfreeze.',
    'kiosk.membershipExpired':    'Membership Expired',
    'kiosk.seeStaffRenew':        'Please see staff to renew.',

    // Session / day counter
    'kiosk.passesRemaining':      'passes remaining',
    'kiosk.sessionsRemaining':    'sessions remaining',
    'kiosk.daysLeft':             '{n} days left',

    // Dynamic messages (set via setMessage)
    'kiosk.notFound':             'No member found with that phone number',
    'kiosk.frozenUntil':          'Membership frozen until {date}',
    'kiosk.expiredRenew':         'Membership has expired — please renew',
    'kiosk.welcome':              'Welcome, {name}!',
    'kiosk.alreadyCheckedIn':     '{name} is already checked in',

    // ─── Receipt ─────────────────────────────────────────────────────────────
    'receipt.back':               'Back',
    'receipt.print':              'Print Receipt',
    'receipt.label':              'Receipt',
    'receipt.paymentReceived':    'Payment Received',
    'receipt.member':             'Member',
    'receipt.name':               'Name',
    'receipt.phone':              'Phone',
    'receipt.email':              'Email',
    'receipt.membership':         'Membership',
    'receipt.type':               'Type',
    'receipt.paymentMethod':      'Payment Method',
    'receipt.startDate':          'Start Date',
    'receipt.validUntil':         'Valid Until',
    'receipt.notes':              'Notes',
    'receipt.thankYou':           'Thank you for your payment!',
    'receipt.receiptId':          'Receipt ID: {id}',
    'receipt.notFound':           'Payment not found',
    'receipt.goBack':             'Go back',

    // ─── SubscriptionPage ─────────────────────────────────────────────────────
    'subscription.title':                  'Subscription',
    'subscription.subtitle':               'Upgrade your Hullu Gyms plan',
    'subscription.renewTitle':             'Renew Your Subscription',
    'subscription.renewSubtitle':          'Your previous plan is pre-selected — choose a duration to continue.',
    'subscription.graceNotice':            'You have {n} grace day(s) remaining. Renew now to avoid interruption.',
    'subscription.currentPlan':            'Current Plan',
    'subscription.daysLeft':               '{n} days left',
    'subscription.graceDaysLeft':          '{n} grace days left',
    'subscription.expired':                'Expired',
    'subscription.renewal':                'Renewal',

    // Pending / declined banners
    'subscription.pendingTitle':           'Subscription Request Under Review',
    'subscription.pendingBody':            'Your request to upgrade to {plan} plan is being reviewed. Transaction ID: {txn}',
    'subscription.pendingSubmitted':       'Submitted {date}',
    'subscription.declinedTitle':          'Previous Request Declined',
    'subscription.declinedReason':         'Reason: {reason}',
    'subscription.declinedRetry':          'You can submit a new request below.',

    // Early bird promo
    'subscription.earlyBirdLabel':         'Early Bird Offer',
    'subscription.earlyBirdBody':          'The first 10 gyms to subscribe get the current price locked in for 6 months — plus priority support & free onboarding. Prices will increase after launch.',
    'subscription.earlyBirdFirst10':       'first 10 gyms',
    'subscription.earlyBirdLocked':        'locked in for 6 months',

    // Plan cards
    'subscription.mostPopular':            'MOST POPULAR',
    'subscription.currentPlanBadge':       '✓ CURRENT PLAN',
    'subscription.promo':                  'Promo',
    'subscription.unlimitedMembers':       'Unlimited members',
    'subscription.upToMembers':            'Up to {n} members',
    'subscription.free':                   'Free',
    'subscription.perMonth':               '/month',
    'subscription.promoLock':              'First 10 gyms get this price locked in for 6 months.',
    'subscription.activePlan':             'Active Plan',
    'subscription.defaultPlan':            'Default Plan',
    'subscription.choosePlan':             'Choose {name}',

    // Plan names
    'subscription.plan.free':              'Free',
    'subscription.plan.starter':           'Starter',
    'subscription.plan.pro':               'Pro',

    // Plan features — Free
    'subscription.feature.upTo10':              'Up to 10 members',
    'subscription.feature.customerMgmt':        'Member profiles & payment history',
    'subscription.feature.attendance':          'Attendance tracking',
    'subscription.feature.checkInOut':          'Check-in / Check-out',
    'subscription.feature.basicDashboard':      'Dashboard & basic reports',
    // Plan features — Starter
    'subscription.feature.upTo100':             'Up to 100 members',
    'subscription.feature.everythingFree':      'Everything in Free',
    'subscription.feature.sms':                 'SMS notifications (welcome & expiry)',
    'subscription.feature.staffAccounts':       'Up to 3 staff accounts',
    'subscription.feature.reports':             'Reports & attendance analytics',
    'subscription.feature.expenseTracking':     'Expense & monthly bill tracking',
    'subscription.feature.pricingPackages':     'Pricing packages for quick billing',
    // Plan features — Pro
    'subscription.feature.unlimited':           'Unlimited members',
    'subscription.feature.everythingStarter':   'Everything in Starter',
    'subscription.feature.revenueAnalytics':    'Revenue & financial analytics',
    'subscription.feature.retentionInsights':   'Member retention & churn insights',
    'subscription.feature.equipmentMgmt':       'Equipment management',
    'subscription.feature.csvExport':           'CSV export & advanced reports',
    'subscription.feature.qrCheckin':           'QR code check-in',
    'subscription.feature.unlimitedStaff':      'Unlimited staff accounts',
    'subscription.feature.prioritySupport':     'Priority support',

    // How it works
    'subscription.howItWorks':             'How It Works',
    'subscription.step1':                  'Choose the plan that fits your gym',
    'subscription.step2':                  'Select how many months you want to pay for',
    'subscription.step3':                  'Send payment via Telebirr / CBE Birr / Bank Transfer',
    'subscription.step4':                  "Enter your transaction ID — we'll verify and activate within hours",

    // Payment step
    'subscription.backToPlans':            'Back to plans',
    'subscription.planSummary':            '{name} Plan',
    'subscription.pricePerMonth':          'ETB {price}/month',
    'subscription.totalPrice':             'ETB {total}',
    'subscription.forMonths':              'for {n} month',
    'subscription.forMonthsPlural':        'for {n} months',
    'subscription.discountOff':            '({pct}% off)',

    // Duration options
    'subscription.duration':               'Duration',
    'subscription.duration.1month':        '1 Month',
    'subscription.duration.3months':       '3 Months',
    'subscription.duration.6months':       '6 Months',
    'subscription.duration.12months':      '12 Months',
    'subscription.comingSoon':             'Coming soon',

    // Payment method section
    'subscription.paymentMethod':          'Payment Method',
    'subscription.sendAmount':             'Send {amount} to:',
    'subscription.accountName':            'Account name: {name}',
    'subscription.cashNote':               'Visit our office to pay in cash. Your plan will be activated after payment is confirmed.',

    // Transaction ID section
    'subscription.transactionId':          'Transaction ID',
    'subscription.transactionHint':        'After completing payment, enter the transaction reference number you received.',
    'subscription.transactionPlaceholder': 'e.g. TXN-20260606-12345',
    'subscription.transactionWarning':     'We will verify this transaction before activating your plan',

    // Submit button
    'subscription.submit':                 'Submit Subscription Request',
    'subscription.submitting':             'Submitting Request...',

    // Toast messages
    'subscription.toast.submitted':        "Request submitted! We'll review and activate your plan shortly.",
    'subscription.toast.txnRequired':      'Please enter your transaction ID',
    'subscription.toast.txnTooShort':      'Transaction ID seems too short. Please check and try again.',
    'subscription.toast.submitFailed':     'Failed to submit request',
  },

  am: {
    // ─── Kiosk ───────────────────────────────────────────────────────────────
    'kiosk.exitKiosk':            'ኪዮስክ ውጣ',
    'kiosk.title':                'የአባል ቼክ-ኢን',
    'kiosk.subtitle':             'ለቼክ-ኢን ስልክ ቁጥርዎን ያስገቡ',
    'kiosk.phonePlaceholder':     'ስልክ ቁጥር',
    'kiosk.cancel':               'ሰርዝ',
    'kiosk.checkIn':              'ቼክ-ኢን',

    // Result screens
    'kiosk.checkInSuccess':       'ቼክ-ኢን ተሳክቷል',
    'kiosk.resetting':            'ወደ ዋናው ሁነታ በመመለስ ላይ…',
    'kiosk.membershipFrozen':     'አባልነት ቀዝቅዟል',
    'kiosk.seeStaffUnfreeze':     'እባክዎ ሰራተኛ ያነጋግሩ ለማቅለጥ።',
    'kiosk.membershipExpired':    'አባልነት ጊዜው አልፏል',
    'kiosk.seeStaffRenew':        'እባክዎ ሰራተኛ ያነጋግሩ ለማደስ።',

    // Session / day counter
    'kiosk.passesRemaining':      'ቀሪ ፓሶች',
    'kiosk.sessionsRemaining':    'ቀሪ ክፍለ ጊዜዎች',
    'kiosk.daysLeft':             '{n} ቀናት ይቀራሉ',

    // Dynamic messages
    'kiosk.notFound':             'በዚያ ስልክ ቁጥር ምንም አባል አልተገኘም',
    'kiosk.frozenUntil':          'አባልነት እስከ {date} ቀዝቅዟል',
    'kiosk.expiredRenew':         'አባልነት ጊዜው አልፏል — እባክዎ ያድሱ',
    'kiosk.welcome':              'እንኳን ደህና መጡ, {name}!',
    'kiosk.alreadyCheckedIn':     '{name} አስቀድሞ ቼክ-ኢን ተደርጓል',

    // ─── Receipt ─────────────────────────────────────────────────────────────
    'receipt.back':               'ተመለስ',
    'receipt.print':              'ደረሰኝ አትም',
    'receipt.label':              'ደረሰኝ',
    'receipt.paymentReceived':    'ክፍያ ተቀብሏል',
    'receipt.member':             'አባል',
    'receipt.name':               'ስም',
    'receipt.phone':              'ስልክ',
    'receipt.email':              'ኢሜይል',
    'receipt.membership':         'አባልነት',
    'receipt.type':               'ዓይነት',
    'receipt.paymentMethod':      'የክፍያ ዘዴ',
    'receipt.startDate':          'የጀመሩበት ቀን',
    'receipt.validUntil':         'ዋጋ ያለው እስከ',
    'receipt.notes':              'ማስታወሻ',
    'receipt.thankYou':           'ለክፍያዎ አመሰግናለሁ!',
    'receipt.receiptId':          'ደረሰኝ መለያ: {id}',
    'receipt.notFound':           'ክፍያ አልተገኘም',
    'receipt.goBack':             'ተመለስ',

    // ─── SubscriptionPage ─────────────────────────────────────────────────────
    'subscription.title':                  'የደንበኝነት ምዝገባ',
    'subscription.subtitle':               'የHullu Gyms ፕላንዎን ያሻሽሉ',
    'subscription.renewTitle':             'ምዝገባዎን ያድሱ',
    'subscription.renewSubtitle':          'ቀዳሚ ፕላንዎ አስቀድሞ ተመርጧል — ለመቀጠል ቆይታ ይምረጡ።',
    'subscription.graceNotice':            '{n} የምህረት ቀናት ይቀራሉ። ምዝገባ እንዳይቋረጥ አሁን ያድሱ።',
    'subscription.currentPlan':            'አሁን ያለ ፕላን',
    'subscription.daysLeft':               '{n} ቀናት ይቀራሉ',
    'subscription.graceDaysLeft':          '{n} የምህረት ቀናት',
    'subscription.expired':                'ጊዜው አልፏል',
    'subscription.renewal':                'ማደስ',

    // Pending / declined banners
    'subscription.pendingTitle':           'የደንበኝነት ምዝገባ ጥያቄ በግምገማ ላይ ነው',
    'subscription.pendingBody':            'ወደ {plan} ፕላን ለማሻሻል ጥያቄዎ በእኛ ዘንድ ይታያል። ግብይት መለያ: {txn}',
    'subscription.pendingSubmitted':       'የቀረበበት ቀን {date}',
    'subscription.declinedTitle':          'ቀዳሚ ጥያቄ ውድቅ ተደርጓል',
    'subscription.declinedReason':         'ምክንያት: {reason}',
    'subscription.declinedRetry':          'ከዚህ በታች አዲስ ጥያቄ ማቅረብ ይችላሉ።',

    // Early bird promo
    'subscription.earlyBirdLabel':         'ቀዳሚ ተመዝጋቢ ቅናሽ',
    'subscription.earlyBirdBody':          'የመጀመሪያዎቹ 10 ጂሞች ለ6 ወራት የአሁኑ ዋጋ ተቆልፎ ይቆያል — ከፍተኛ ድጋፍ እና ነጻ ስልጠና ጭምር። ዋጋዎቹ ከጅምር በኋላ ይጨምራሉ።',
    'subscription.earlyBirdFirst10':       'የመጀመሪያዎቹ 10 ጂሞች',
    'subscription.earlyBirdLocked':        'ለ6 ወራት ተቆልፏል',

    // Plan cards
    'subscription.mostPopular':            'በጣም ታዋቂ',
    'subscription.currentPlanBadge':       '✓ አሁን ያለ ፕላን',
    'subscription.promo':                  'ቅናሽ',
    'subscription.unlimitedMembers':       'ያልተወሰነ አባላት',
    'subscription.upToMembers':            'እስከ {n} አባላት',
    'subscription.free':                   'ነጻ',
    'subscription.perMonth':               '/ወር',
    'subscription.promoLock':              'የመጀመሪያዎቹ 10 ጂሞች ይህ ዋጋ ለ6 ወራት ተቆልፎ ይቆያቸዋል።',
    'subscription.activePlan':             'ንቁ ፕላን',
    'subscription.defaultPlan':            'ነባሪ ፕላን',
    'subscription.choosePlan':             '{name} ይምረጡ',

    // Plan names
    'subscription.plan.free':              'ነጻ',
    'subscription.plan.starter':           'Starter',
    'subscription.plan.pro':               'Pro',

    // Plan features — Free
    'subscription.feature.upTo10':         'እስከ 10 አባላት',
    'subscription.feature.customerMgmt':   'የደንበኛ አስተዳደር',
    'subscription.feature.attendance':     'የመገኘት ክትትል',
    'subscription.feature.checkInOut':     'ቼክ-ኢን / ቼክ-አውት',
    'subscription.feature.basicDashboard': 'መሠረታዊ ዳሽቦርድ',
    // Plan features — Starter
    'subscription.feature.upTo100':        'እስከ 100 አባላት',
    'subscription.feature.everythingFree': 'ሁሉም ያለ ነጻ ፕላን',
    'subscription.feature.sms':            'SMS ማሳወቂያዎች',
    'subscription.feature.staffAccounts':  'የሰራተኛ መለያዎች',
    'subscription.feature.reports':        'ሪፖርቶች እና ትንታኔ',
    // Plan features — Pro
    'subscription.feature.unlimited':      'ያልተወሰነ አባላት',
    'subscription.feature.everythingStarter': 'ሁሉም ያለ Starter ፕላን',
    'subscription.feature.revenueAnalytics': 'የገቢ ትንታኔ',
    'subscription.feature.csvExport':      'CSV ላክ',
    'subscription.feature.prioritySupport': 'ቅድሚያ ድጋፍ',
    'subscription.feature.qrCheckin':      'QR ኮድ ቼክ-ኢን',

    // How it works
    'subscription.howItWorks':             'እንዴት ይሰራል',
    'subscription.step1':                  'ለጂምዎ የሚስማማ ፕላን ይምረጡ',
    'subscription.step2':                  'ለምን ያህል ወራት መክፈል እንደሚፈልጉ ይምረጡ',
    'subscription.step3':                  'ክፍያ በቴሌብር / CBE Birr / የባንክ ዝውውር ይላኩ',
    'subscription.step4':                  'የግብይት መለያዎን ያስገቡ — ክፍያውን ካረጋገጥን ፕላንዎን እናሰፋፋለን',

    // Payment step
    'subscription.backToPlans':            'ወደ ፕላኖቹ ተመለስ',
    'subscription.planSummary':            '{name} ፕላን',
    'subscription.pricePerMonth':          'ETB {price}/ወር',
    'subscription.totalPrice':             'ETB {total}',
    'subscription.forMonths':              'ለ{n} ወር',
    'subscription.forMonthsPlural':        'ለ{n} ወራት',
    'subscription.discountOff':            '({pct}% ቅናሽ)',

    // Duration options
    'subscription.duration':               'የጊዜ ርዝማኔ',
    'subscription.duration.1month':        '1 ወር',
    'subscription.duration.3months':       '3 ወራት',
    'subscription.duration.6months':       '6 ወራት',
    'subscription.duration.12months':      '12 ወራት',
    'subscription.comingSoon':             'በቅርቡ ይመጣል',

    // Payment method section
    'subscription.paymentMethod':          'የክፍያ ዘዴ',
    'subscription.sendAmount':             '{amount} ይላኩ ወደ:',
    'subscription.accountName':            'የመለያ ስም: {name}',
    'subscription.cashNote':               'ክፍያ ለመፈጸም ቢሮአችን ይምጡ። ክፍያ ከተረጋገጠ በኋላ ፕላንዎ ይከፈታል።',

    // Transaction ID section
    'subscription.transactionId':          'የግብይት መለያ',
    'subscription.transactionHint':        'ክፍያ ከፈጸሙ በኋላ የተቀበሉትን የማጣቀሻ ቁጥር ያስገቡ።',
    'subscription.transactionPlaceholder': 'ለምሳሌ TXN-20260606-12345',
    'subscription.transactionWarning':     'ፕላንዎን ከማሰፋፋታችን በፊት ይህን ግብይት እናረጋግጣለን',

    // Submit button
    'subscription.submit':                 'የደንበኝነት ምዝገባ ጥያቄ አስገባ',
    'subscription.submitting':             'ጥያቄ በማስገባት ላይ...',

    // Toast messages
    'subscription.toast.submitted':        'ጥያቄ ቀርቧል! ገምግመን ፕላንዎን ብዙም ሳይቆይ እናሰፋፋለን።',
    'subscription.toast.txnRequired':      'እባክዎ የግብይት መለያዎን ያስገቡ',
    'subscription.toast.txnTooShort':      'የግብይት መለያው በጣም አጭር ይመስላል። እባክዎ ያረጋግጡ እና እንደገና ይሞክሩ።',
    'subscription.toast.submitFailed':     'ጥያቄ ማስገባት አልተሳካም',
  },
};
