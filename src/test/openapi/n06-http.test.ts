import {expect, it} from 'vitest';
import {server, testApiUrl} from '@/test/server';
import {managementMocks} from '@/mocks/shared/management-handlers';
import {inputMocks} from '@/mocks/shared/input-handlers';
import {supportMocks} from '@/mocks/shared/support-handlers';
import {createAppServices} from '@/lib/app-services';
import {caseInputsApi} from '@/features/case-inputs/api';
import {resultsApi} from '@/features/results/api';
import {supportApi} from '@/features/case-support/api';
import {createOpenApiContract, type ContractRequest, type ContractResult} from './contract';

it('N06 captures actual FE fetch successes for calculation, comparison and report PDF', async () => {
    const contract=createOpenApiContract();
    const management=managementMocks({baseUrl:testApiUrl,count:2});
    const mock=inputMocks(management.getCases,testApiUrl);
    server.use(...mock.handlers,...management.handlers,...supportMocks(testApiUrl,mock.getResult,()=>[]));
    const app=createAppServices(testApiUrl);
    app.session.start('test-only-token');
    const inputs=caseInputsApi(app.api), results=resultsApi(app.api), support=supportApi(app.api);
    const observed: {input:ContractRequest;request:ContractResult;response:ContractResult;status:number;type:string}[]=[];
    const pending: Promise<void>[]=[];
    const requests=new Map<string,Request>();
    const capture=({request,requestId}:{request:Request;requestId:string}) => {requests.set(requestId,request.clone());};
    const observe = ({request,response,requestId}: {request:Request;response:Response;requestId:string}) => {
        const path=new URL(request.url).pathname;
        if (!(request.method==='POST' && /\/(calculations|comparisons)$/.test(path)) && !path.endsWith('/pdf')) return;
        const req=requests.get(requestId)!, res=response.clone();
        pending.push((async()=>{
            const input:ContractRequest={method:req.method,url:req.url,headers:Object.fromEntries(req.headers),
                body:req.body ? await req.json() : undefined};
            observed.push({input,request:contract.request(input),response:await contract.httpResponse(input,res),status:res.status,type:res.headers.get('content-type')??''});
        })());
    };
    server.events.on('request:start',capture);
    server.events.on('response:mocked',observe);
    try {
        await inputs.create(15,{recordType:'CONTRACT',source:'USER_INPUT',data:{hourlyWage:12000,monthlyBasePay:2000000}});
        await inputs.create(15,{recordType:'PAYSLIP',source:'USER_INPUT',data:{hourlyWage:11000}});
        const current=management.getCases().find(c=>c.caseId===15)!;
        await inputs.saveConditions(15,{expectedInputVersion:current.inputVersion,answers:[
            {conditionId:'comparison_basis_confirmed',value:true},{conditionId:'base_scope_confirmed',value:true},
            {conditionId:'regular_minutes',value:10000}]});
        mock.setJobStatus(15,'PARTIAL');
        expect((await results.execute(15,'calculations',current.inputVersion)).jobId).toBeTruthy();
        mock.setJobStatus(15,'PARTIAL');
        expect((await results.execute(15,'comparisons',current.inputVersion)).jobId).toBeTruthy();
        mock.setJobStatus(15,'PARTIAL');
        const receipt=await support.create(15,[],'n06-pdf');
        let report=receipt;
        for(let i=0;i<3;i++) report=await support.report(15,receipt.reportId);
        expect(report.status).toBe('READY');
        const downloaded=await app.api.requestDownload('/cases/15/reports/'+receipt.reportId+'/pdf','application/pdf','report.pdf');
        expect(downloaded.blob.type).toBe('application/pdf');
        expect(downloaded.blob.size).toBeGreaterThan(0);
        await Promise.all(pending);
        expect(observed).toHaveLength(3);
        for(const item of observed) {
            expect(item.request).toMatchObject({valid:true,errors:[],unsupported:[],undeclaredQuery:[]});
            expect(item.input.headers?.authorization).toBe('Bearer test-only-token');
            expect(item.response.valid,JSON.stringify(item.response)).toBe(true);
        }
        for(const endpoint of ['calculations','comparisons']) {
            const item=observed.find(o=>o.input.url.endsWith('/'+endpoint))!;
            expect(item.input.body).toEqual({confirmed:true,expectedInputVersion:current.inputVersion});
            expect(item).toMatchObject({status:202,type:'application/json',response:{coverage:'free-json',unverified:['Envelope.data internal DTO unspecified']}});
        }
        expect(observed.find(o=>o.input.url.endsWith('/pdf'))).toMatchObject({status:200,type:'application/pdf',
            response:{coverage:'transport-only',unverified:['Response media type/body unspecified by OpenAPI','Binary file contents']}});
    } finally {
        server.events.removeListener('request:start',capture);
        server.events.removeListener('response:mocked',observe);
        app.session.clear();app.queryClient.clear();
    }
},15000);
