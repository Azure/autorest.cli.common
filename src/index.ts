import { AutoRestExtension, Channel } from '@azure-tools/autorest-extension-base';
import * as yaml from "node-yaml";


export type LogCallback = (message: string) => void;
export type FileCallback = (path: string, rows: string[]) => void;

const extension = new AutoRestExtension();

export enum ArtifactType
{
    ArtifactTypeAzureAzModule,
    ArtifactTypeAzureAzExtension,
}

extension.Add("cli-common", async autoRestApi => {

    let log = await autoRestApi.GetValue("log");

    function Info(s: string)
    {
        if (log)
        {
            autoRestApi.Message({
                Channel: Channel.Information,
                Text: s
            });
        }
    }

    function Error(s: string)
    {
        autoRestApi.Message({
            Channel: Channel.Error,
            Text: s
        });
    }

    try
    {
        // read files offered to this plugin
        const inputFileUris = await autoRestApi.ListInputs();

        const inputFiles: string[] = await Promise.all(inputFileUris.map(uri => autoRestApi.ReadFile(uri)));

        let artifactType: ArtifactType;
        let writeIntermediate: boolean = false;

        // namespace is the only obligatory option
        // we will derive default "package-name" and "root-name" from it
        const namespace = await autoRestApi.GetValue("namespace");

        if (!namespace)
        {
            Error("\"namespace\" is not defined, please add readme.az.md file to the specification.");
            return;
        }

        // package name and group name can be guessed from namespace
        let packageName = await autoRestApi.GetValue("package-name") || namespace.replace(/\./g, '-');
        let cliCommonName = await autoRestApi.GetValue("group-name") || await autoRestApi.GetValue("cli-common-name") || packageName.split('-').pop();

 
        let tag = await autoRestApi.GetValue("tag");
        Info(tag);

        // Handle generation type parameter
        if (await autoRestApi.GetValue("cli-common"))
        {
            Info("GENERATION: --cli-common");
            artifactType = (await autoRestApi.GetValue("extension")) ? ArtifactType.ArtifactTypeAzureAzExtension : ArtifactType.ArtifactTypeAzureAzModule;
        }

        for (let iff of inputFiles)
        {
            //-------------------------------------------------------------------------------------------------------------------------
            //
            // PARSE INPUT MODEL
            //
            //-------------------------------------------------------------------------------------------------------------------------
            let swagger = JSON.parse(iff);


            //-------------------------------------------------------------------------------------------------------------------------
            //
            // WRITE INTERMEDIATE FILE IF --intermediate OPTION WAS SPECIFIED
            //
            //-------------------------------------------------------------------------------------------------------------------------
            if (writeIntermediate)
            {
                autoRestApi.WriteFile("intermediate/" + cliCommonName + "-input.yml", yaml.dump(swagger));
            }
        }
    }
    catch (e)
    {
        Error(e.message + " -- " + JSON.stringify(e.stack));
    }
});

extension.Run();