const { getDataService } = require('./src/services/DataService.ts');

async function checkSurveys() {
  try {
    const dataService = getDataService();
    const surveys = await dataService.getAllSurveys();
    console.log('📊 All Surveys:');
    surveys.forEach((survey, index) => {
      console.log(`${index + 1}. ID: ${survey.id}`);
      console.log(`   Name: ${survey.name}`);
      console.log(`   Type: ${survey.type}`);
      console.log(`   Year: ${survey.year}`);
      console.log(`   SurveyYear: ${survey.surveyYear}`);
      console.log(`   Upload Date: ${survey.uploadDate}`);
      console.log(`   All fields: ${Object.keys(survey).join(', ')}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSurveys();