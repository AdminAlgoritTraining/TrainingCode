const judge0Api = require('../config/judge0');

class Judge0Service {
    static async submitCode(code, testCases, language_id = 91) {
        try {
            // ✅ Validación anticipada
            if (/public\s+class\s+\w+/.test(code)) {
                return {
                    success: false,
                    message: 'No incluyas clases públicas como "public class Nombre". Solo envía el método estático requerido.',
                    output: '',
                    error: 'Clase pública detectada. Envia únicamente el método, no una clase completa.',
                    statusId: 6 // Compilation Error
                };
            }

            const wrappedCode = this.wrapJavaCode(code);

            // Muestra el código generado por el wrapper
            // console.log('Código enviado a Judge0:\n', wrappedCode);

            const base64Code = Buffer.from(wrappedCode).toString('base64');
            const base64Input = testCases.input ? Buffer.from(testCases.input).toString('base64') : '';

            const options = {
                method: 'POST',
                url: '/submissions',
                params: {
                    base64_encoded: 'true',
                    wait: 'true',
                    fields: '*'
                },
                data: {
                    language_id,
                    source_code: base64Code,
                    stdin: base64Input
                }
            };

            const response = await judge0Api.request(options);

            const result = {
                status: response.data.status,
                output: response.data.stdout ? Buffer.from(response.data.stdout, 'base64').toString() : '',
                error: response.data.stderr ? Buffer.from(response.data.stderr, 'base64').toString() :
                    response.data.compile_output ? Buffer.from(response.data.compile_output, 'base64').toString() : '',
                message: response.data.message
            };

            return this.processResult(result);
        } catch (error) {
            console.error('Error en Judge0:', error);
            throw error;
        }
    }

    static extractFullMethod(code) {
        const methodStart = code.search(/public\s+static/);
        if (methodStart === -1) return null;
        let openBraces = 0;
        let started = false;
        let end = methodStart;
        for (let i = methodStart; i < code.length; i++) {
            if (code[i] === '{') {
                openBraces++;
                started = true;
            } else if (code[i] === '}') {
                openBraces--;
                if (started && openBraces === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        return code.substring(methodStart, end);
    }

    static wrapJavaCode(solutionCode) {
        try {
            // Limpia imports y packages, pero mantiene el código principal
            solutionCode = solutionCode
                .replace(/package\s+[^;]+;/g, '')
                .replace(/import\s+[^;]+;/g, '')
                .trim();

            // Verifica si ya existe una clase pública
            const hasPublicClass = /public\s+class\s+\w+/.test(solutionCode);

            if (hasPublicClass) {
                // Si ya tiene una clase pública, solo agregar imports útiles
                return `import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

${solutionCode}`.trim();
            } else {
                // Si no tiene clase pública, envolver en clase Main
                return `import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

public class Main {
    ${solutionCode}
}`.trim();
            }
        } catch (error) {
            console.error('Error al procesar el código:', error);
            throw new Error('Error al procesar el código: ' + error.message);
        }
    }


    static processResult(result) {
        const statusMap = {
            3: { success: true, message: 'Accepted' },
            4: { success: false, message: 'Wrong Answer' },
            5: { success: false, message: 'Time Limit Exceeded' },
            6: { success: false, message: 'Compilation Error' },
            7: { success: false, message: 'Runtime Error (SIGSEGV)' },
            8: { success: false, message: 'Runtime Error (SIGXFSZ)' },
            9: { success: false, message: 'Runtime Error (SIGFPE)' },
            10: { success: false, message: 'Runtime Error (SIGABRT)' },
            11: { success: false, message: 'Runtime Error (NZEC)' },
            12: { success: false, message: 'Runtime Error (Other)' },
            13: { success: false, message: 'Internal Error' },
            14: { success: false, message: 'Exec Format Error' }
        };

        return {
            success: statusMap[result.status.id]?.success || false,
            message: statusMap[result.status.id]?.message || 'Unknown Error',
            output: result.output || '',
            error: result.error || '',
            statusId: result.status.id
        };
    }
}

module.exports = Judge0Service;