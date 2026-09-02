import { GemmaReport, ReportLanguage } from '../types';

export interface TranslatedReportContent {
  headline: string;
  stageName: string;
  plainLanguage: string;
  visualFindingsHeatmap: string;
  visualFindingsVessels: string;
  riskUntreated6Mo: string;
  riskManaged6Mo: string;
  riskUntreated12Mo: string;
  riskManaged12Mo: string;
  actionPlan: string[];
  dietRecommendations: string[];
  followUp: string;
  disclaimer: string;
  urgencyText: string;
}

export const REPORT_TRANSLATIONS: Record<ReportLanguage, (report: GemmaReport) => TranslatedReportContent> = {
  english: (report: GemmaReport) => ({
    headline: `Gemma-4 Clinical Diagnostic Report — ${report.current_diagnosis.stage_name}`,
    stageName: report.current_diagnosis.stage_name,
    plainLanguage: report.current_diagnosis.plain_language,
    visualFindingsHeatmap: report.visual_findings.heatmap_summary,
    visualFindingsVessels: report.visual_findings.vessel_analysis,
    riskUntreated6Mo: report.risk_prediction['6_month'].scenario_if_untreated,
    riskManaged6Mo: report.risk_prediction['6_month'].scenario_if_managed,
    riskUntreated12Mo: report.risk_prediction['12_month'].scenario_if_untreated,
    riskManaged12Mo: report.risk_prediction['12_month'].scenario_if_managed,
    actionPlan: report.action_plan,
    dietRecommendations: report.diet_recommendations,
    followUp: report.recommended_follow_up,
    disclaimer: report.disclaimer,
    urgencyText: report.urgency,
  }),

  hindi: (report: GemmaReport) => {
    const stage = report.current_diagnosis.stage;
    const stageNamesHindi: Record<number, string> = {
      0: 'चरण 0: कोई रेटिनोपैथी नहीं (स्वस्थ रेटिना)',
      1: 'चरण 1: हल्का गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (माइल्ड NPDR)',
      2: 'चरण 2: मध्यम डायबिटिक रेटिनोपैथी (मॉडरेट NPDR)',
      3: 'चरण 3: गंभीर डायबिटिक रेटिनोपैथी (सिवियर NPDR)',
      4: 'चरण 4: प्रोलिफेरेटिव रेटिनोपैथी (अत्यंत गंभीर DR)',
    };

    const plainHindi: Record<number, string> = {
      0: 'आपकी आंखों की रेटिना पूरी तरह से स्वस्थ है। मधुमेह (शुगर) के कारण नसों को कोई नुकसान नहीं हुआ है। अपनी शुगर को नियंत्रित रखें।',
      1: 'आपकी रेटिना में शुरुआती छोटे उभार (माइक्रोएन्यूरिज्म) दिखे हैं। शुगर और ब्लड प्रेशर को सही रखकर आंखों की रोशनी को सुरक्षित रखा जा सकता है।',
      2: 'रेटिना में मध्यम स्तर की सूजन और खून के हल्के धब्बे मिले हैं। आंखों के विशेषज्ञ डॉक्टर से जल्द जांच कराना जरूरी है।',
      3: 'रेटिना में खून का बहाव गंभीर रूप से प्रभावित है और कई जगह रक्तस्राव हुआ है। नजर बचाने के लिए 1-2 हफ़्तों में लेजर या इंजेक्शन की जरूरत पड़ सकती है।',
      4: 'रेटिना में नई कमजोर नसें बन गई हैं जिनसे कभी भी अचानक खून बह सकता है। तुरंत 24 से 48 घंटे के भीतर नेत्र अस्पताल में दिखाएं।',
    };

    const urgencyHindi: Record<string, string> = {
      ROUTINE: 'नियमित जांच',
      SOON: 'जल्द परामर्श आवश्यक',
      URGENT: 'अति आवश्यक जांच',
      IMMEDIATE: 'आपातकालीन तुरंत जांच',
    };

    const followUpHindi: Record<number, string> = {
      0: '12 महीने बाद (वार्षिक जांच)',
      1: '6 से 9 महीने के भीतर',
      2: '3 से 4 महीने के भीतर',
      3: '1 से 2 सप्ताह के भीतर',
      4: '24-48 घंटों के भीतर (नेत्र आपातकाल)',
    };

    return {
      headline: `जेम्मा-4 क्लिनिकल डायग्नोस्टिक रिपोर्ट — ${stageNamesHindi[stage] || report.current_diagnosis.stage_name}`,
      stageName: stageNamesHindi[stage] || report.current_diagnosis.stage_name,
      plainLanguage: plainHindi[stage] || report.current_diagnosis.plain_language,
      visualFindingsHeatmap: `एआई ग्रैड-कैम विश्लेषण: रेटिना के केंद्रीय हिस्से में संवेदनशीलता और घावों की पहचान की गई है (सटीकता ${report.current_diagnosis.confidence})।`,
      visualFindingsVessels: `रक्त वाहिका घनत्व विश्लेषण: रेटिना में रक्त नलिकाओं की सेहत और रक्त प्रवाह की स्थिति जांची गई है।`,
      riskUntreated6Mo: stage <= 1 ? 'यदि शुगर अनियंत्रित रही तो 6 महीने में रेटिना में अधिक रिसाव होने की संभावना।' : 'यदि तुरंत इलाज न कराया गया तो 6 महीने में नजर काफी कमजोर हो सकती है।',
      riskManaged6Mo: 'दवा, खान-पान और डॉक्टर के निर्देश से 85% से अधिक मामलों में रोग को रोका जा सकता है।',
      riskUntreated12Mo: '1 वर्ष में आंखों की रोशनी को स्थायी नुकसान होने का खतरा।',
      riskManaged12Mo: 'उचित देखभाल से आंखों की रोशनी लंबे समय तक सुरक्षित रहेगी।',
      actionPlan: [
        'खाली पेट ब्लड शुगर (80-120 mg/dL) और HbA1c 7% से नीचे रखने का लक्ष्य रखें।',
        'अपने ब्लड प्रेशर (130/80 से कम) और कोलेस्ट्रॉल की नियमित जांच कराएं।',
        'नेत्र रोग विशेषज्ञ (रेटिना स्पेशलिस्ट) से सुझाई गई समय सीमा में जरूर मिलें।',
        'यदि अचानक आंख के सामने काला धब्बा या धुंधलापन आए तो तुरंत डॉक्टर के पास जाएं।',
      ],
      dietRecommendations: [
        'हरी पत्तेदार सब्जियां (पालक, मेथी) खाएं जो रेटिना को शक्ति देती हैं।',
        'आंवला, जामुन और एंटीऑक्सीडेंट युक्त फल खाएं।',
        'मीठा, कोल्ड ड्रिंक, तली-भुनी चीजें और अधिक नमक से पूरी तरह बचें।',
      ],
      followUp: followUpHindi[stage] || report.recommended_follow_up,
      disclaimer: 'ऑप्टीजेम्मा (DrishtiAI) एक एआई सहायता प्रणाली है। कृपया अंतिम निर्णय और इलाज के लिए नेत्र रोग विशेषज्ञ से संपर्क करें।',
      urgencyText: urgencyHindi[report.urgency] || report.urgency,
    };
  },

  gujarati: (report: GemmaReport) => {
    const stage = report.current_diagnosis.stage;
    const stageNamesGuj: Record<number, string> = {
      0: 'તબક્કો ૦: કોઈ રેટિનોપેથી નથી (તંદુરસ્ત આંખ)',
      1: 'તબક્કો ૧: હળવી ડાયાબિટીક રેટિનોપેથી (માઇલ્ડ NPDR)',
      2: 'તબક્કો ૨: મધ્યમ ડાયાબિટીક રેટિનોપેથી (મોડરેટ NPDR)',
      3: 'તબક્કો ૩: ગંભીર ડાયાબિટીક રેટિનોપેથી (સિવિયર NPDR)',
      4: 'તબક્કો ૪: અત્યંત ગંભીર પ્રસારિત રેટિનોપેથી (PDR)',
    };

    const plainGuj: Record<number, string> = {
      0: 'તમારા આંખના પડદા (રેટિના) ની નસો એકદમ તંદુરસ્ત છે. ડાયાબિટીસની આંખ પર કોઈ નકારાત્મક અસર દેખાઈ નથી.',
      1: 'આંખના પડદાની નસોમાં નાના સોજા (માઇક્રોએન્યુરિઝમ) જોવા મળ્યા છે. સમયસર કાળજી રાખવાથી દ્રષ્ટિ સુરક્ષિત રહેશે.',
      2: 'આંખના પડદામાં લોહીના નાના ડાઘ અને ચરબીના જમાવડા દેખાયા છે. આંખના ડૉક્ટર પાસે વિસ્તૃત તપાસ કરાવવી જરૂરી છે.',
      3: 'આંખના પડદામાં લોહીનું પરિભ્રમણ ગંભીર રીતે જોખમમાં છે. ૧ થી ૨ અઠવાડિયામાં રેટિના નિષ્ણાત પાસે લેસર અથવા ઇન્જેક્શનની સલાહ લો.',
      4: 'આંખના પડદામાં નવી નબળી નસો ફૂટી નીકળી છે જેનાથી અચાનક અંધાપો આવી શકે છે. તાત્કાલિક ૨૪ થી ૪૮ કલાકમાં હોસ્પિટલ પહોંચો.',
    };

    const followUpGuj: Record<number, string> = {
      0: '૧૨ મહિના પછી (વાર્ષિક નિયમિત તપાસ)',
      1: '૬ થી ૯ મહિનાની અંદર',
      2: '૩ થી ૪ મહિનાની અંદર',
      3: '૧ થી ૨ અઠવાડિયાની અંદર',
      4: '૨૪ થી ૪૮ કલાકની અંદર (તાત્કાલિક રેટિના વિભાગ)',
    };

    return {
      headline: `જેમ્મા-૪ ક્લિનિકલ ડાયગ્નોસ્ટિક રિપોર્ટ — ${stageNamesGuj[stage] || report.current_diagnosis.stage_name}`,
      stageName: stageNamesGuj[stage] || report.current_diagnosis.stage_name,
      plainLanguage: plainGuj[stage] || report.current_diagnosis.plain_language,
      visualFindingsHeatmap: `AI હીટમેપ પરિણામ: આંખના કેન્દ્રિય મેક્યુલા ભાગમાં દબાણ અને પ્રારંભિક ફેરફારોનું વિશ્લેષણ કરવામાં આવ્યું છે.`,
      visualFindingsVessels: `રક્તવાહિની ઘનતા વિશ્લેષણ: રેટિનામાં લોહી પહોંચાડતી નસોની સ્થિતિ ચકાસવામાં આવી છે.`,
      riskUntreated6Mo: 'જો સારવાર ન કરવામાં આવે તો આગામી ૬ મહિનામાં રેટિનામાં પ્રવાહી અને સોજો વધવાનું જોખમ રહે છે.',
      riskManaged6Mo: 'યોગ્ય દવાઓ અને ડાયેટ નિયંત્રણથી ૮૫% થી વધુ દર્દીઓમાં રોગ આગળ વધતો અટકી જાય છે.',
      riskUntreated12Mo: '૧૨ મહિનામાં કેન્દ્રીય દ્રષ્ટિને કાયમી નુકસાન થવાની સંભાવના.',
      riskManaged12Mo: 'સતત સંભાળથી આંખનું તેજ અને જોવાની ક્ષમતા લાંબા ગાળા સુધી જળવાઈ રહે છે.',
      actionPlan: [
        'સુગર (HbA1c < ૭.૦%) અને બ્લડ પ્રેશર (૧૩૦/૮૦) હંમેશા નિયંત્રણમાં રાખો.',
        'સૂચવેલા સમયગાળામાં આંખના નિષ્ણાત (રેટિના સ્પેશિયાલિસ્ટ) ની મુલાકાત લો.',
        'આંખ સામે અચાનક કાળા ધાબા અથવા ઝાંખપ જણાય તો તાત્કાલિક તબીબી સંપર્ક કરો.',
        'રોજ ૩૦ મિનિટ હળવી કસરત અને આંખની કસરત કરો.',
      ],
      dietRecommendations: [
        'લીલા શાકભાજી (પાલક, મેથી, સરગવો) ભરપૂર માત્રામાં લો.',
        'જાંબુ, આમળા અને કઠોળ નિયમિત ખાઓ.',
        'મીઠાઈ, તળેલા ખોરાક અને વધુ પડતા મીઠાથી દૂર રહો.',
      ],
      followUp: followUpGuj[stage] || report.recommended_follow_up,
      disclaimer: 'ઓપ્ટીજેમ્મા (DrishtiAI) એ એક AI સહાયક ક્લિનિકલ સિસ્ટમ છે. અંતિમ નિર્ણય માન્ય આંખના ડૉક્ટર દ્વારા જ લેવો.',
      urgencyText: report.urgency,
    };
  },
};
